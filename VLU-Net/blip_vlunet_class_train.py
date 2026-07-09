# %%
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader

from utils.dataset_utils_clip import PromptTrainDataset, TestDataset_forIR
from net.Final import VLUNet
from utils.schedulers import LinearWarmupCosineAnnealingLR
# import wandb
import pytorch_lightning as pl
from pytorch_lightning.loggers import WandbLogger
from pytorch_lightning.callbacks import ModelCheckpoint
from utils.val_utils import AverageMeter, compute_psnr_ssim
from utils.image_io import save_image_tensor
import os
import argparse
import open_clip
from net.clip import *
os.environ["CUDA_VISIBLE_DEVICES"] = "0,1,2,3,4,5,6,7"

from pytorch_lightning.callbacks import TQDMProgressBar
from tqdm.auto import tqdm
from pytorch_lightning.loggers import TensorBoardLogger
import glob

torch.set_float32_matmul_precision("high")

# %%
parser = argparse.ArgumentParser()
# Input Parameters
parser.add_argument('--cuda', type=int, default=0)

# modify based on task, eg. "Denoise", "Dehaze", "Derain", "Deblur", "Delowlight", "NHR", "NHRBL"
parser.add_argument('--name', type=str, default="Deblur_Class") 

parser.add_argument('--epochs', type=int, default=200, help='maximum number of epochs to train the total model.')
parser.add_argument('--batch_size', type=int,default=8,help="Batch size to use per GPU")
parser.add_argument('--lr', type=float, default=2e-4, help='learning rate of encoder.')

# modify based on type of degradations, eg. "denoise_15", "denoise_25", "denoise_50", "derain", "dehaze", "deblur", "delowlight"
parser.add_argument('--de_type', nargs='+', default=['deblur'],
                    help='which type of degradations is training and testing for.')
# parser.add_argument('--de_type', nargs='+', default=['denoise_15', 'denoise_25', 'denoise_50', 'derain', 'dehaze'],
#                     help='which type of degradations is training and testing for.')
# parser.add_argument('--de_type', nargs='+', default=['denoise_15', 'denoise_25', 'denoise_50'],
#                     help='which type of degradations is training and testing for.')
parser.add_argument('--de_dim', type=int, default=5)

parser.add_argument('--patch_size', type=int, default=128, help='patchsize of input.')
parser.add_argument('--num_workers', type=int, default=16, help='number of workers.')
parser.add_argument("--num_gpus",type=int,default=1,help = "Number of GPUs to use for training")

# path
parser.add_argument('--denoise15_dir', type=str, default='./datasets/denoising_datasets/15_train_paths.txt',
                    help='paths for 15 noise and clean, where clean images of denoising saves.')
parser.add_argument('--denoise25_dir', type=str, default='./datasets/denoising_datasets/25_train_paths.txt',
                    help='paths for 25 noise and clean, where clean images of denoising saves.')
parser.add_argument('--denoise50_dir', type=str, default='./datasets/denoising_datasets/50_train_paths.txt',
                    help='paths for 50 noise and clean, where clean images of denoising saves.')
parser.add_argument('--derain_dir', type=str, default='./datasets/deraining_datasets/train_paths.txt',
                    help='where training images of deraining saves.')
parser.add_argument('--dehaze_dir', type=str, default='./datasets/dehazing_datasets/train_paths.txt',
                    help='hazeimages and clean, where training images of dehazing saves.')
parser.add_argument('--deblur_dir', type=str, default='./datasets/deblurring_datasets/GoPro/train_paths.txt',
                    help='blurimages and clean, where training images of dehazing saves.')
parser.add_argument('--delowlight_dir', type=str, default='./datasets/delowlight_datasets/LoL/train_paths.txt',
                    help='lowlightimages and clean, where training images of dehazing saves.')

parser.add_argument("--is_addRainSets",type=bool,default=False, help = "is added datasets for rain is added")
parser.add_argument('--is_clip_tuning', type=bool,default=True, help='is finetuning clip')
parser.add_argument('--is_clip', type=bool,default=True, help='is clip')

parser.add_argument('--output_path', type=str, default="output/", help='output save path')
parser.add_argument('--ckpt_path', type=str, default="ckpt/", help='checkpoint save path')
options = parser.parse_args(args=[])

options.output_path = os.path.join(options.output_path, options.name)
options.ckpt_path = os.path.join(options.ckpt_path, options.name)
os.makedirs(options.output_path, exist_ok=True)
os.makedirs(options.ckpt_path, exist_ok=True)

if options.is_addRainSets == False:
    options.derain_dir = "./datasets/deraining_datasets/Rain100L/train_paths.txt"

# %%
class DAdunModel(pl.LightningModule):
    def __init__(self):
        super().__init__()
        self.net = VLUNet(options.de_dim)

        if options.is_clip:
            clip, _, _ = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
            if options.is_clip_tuning:
                self.model_degradation = DA_adapter(clip)
                self.model_degradation.set_frozen()
                pth_file = "blip_vlunet_pretrained_ckpt/blip_vlunet_class_clip_tuned.pth"
                checkpoint = torch.load(pth_file, map_location=torch.device('cpu'))
                self.model_degradation.load_state_dict(checkpoint['learnable_params'], strict=False)
            else:
                for param in clip.parameters():
                    param.requires_grad = False
                self.model_degradation = clip

        self.loss_fn  = nn.L1Loss()
        self.validation_step_outputs = []

    def forward(self,x, clip_input):
        degradation_features = ""
        if options.is_clip:
            if options.is_clip_tuning:
                degradation_features = self.model_degradation.get_image_features(clip_input)
            else:
                degradation_features = self.model_degradation.encode_image(clip_input)

        return self.net(x, degradation_features)

    def training_step(self, batch, batch_idx):
        ([clean_name, de_id], degrad_patch, clean_patch, clip_input) = batch

        degradation_features = ""
        if options.is_clip:
            if options.is_clip_tuning:
                degradation_features = self.model_degradation.get_image_features(clip_input)
            else:
                degradation_features = self.model_degradation.encode_image(clip_input)

        restored = self.net(degrad_patch, degradation_features)

        loss = self.loss_fn(restored,clean_patch)
        # Logging to TensorBoard (if installed) by default
        # self.log("train_loss", loss)
        self.log("train_loss", loss, on_step=False, on_epoch=True, prog_bar=True, logger=True)

        return loss

    def lr_scheduler_step(self,scheduler,metric):
        scheduler.step(self.current_epoch)
        lr = scheduler.get_last_lr()

    def configure_optimizers(self):
        optimizer = optim.AdamW(self.parameters(), lr=2e-4)
        scheduler = LinearWarmupCosineAnnealingLR(optimizer=optimizer,warmup_epochs=15,max_epochs=options.epochs)
        return [optimizer],[scheduler]

    def validation_step(self, batch, batch_idx, dataloader_idx=0):
        (input, target, clip_input, type, name, sets_name) = batch

        degradation_features = ""
        if options.is_clip:
            if options.is_clip_tuning:
                degradation_features = self.model_degradation.get_image_features(clip_input)
            else:
                degradation_features = self.model_degradation.encode_image(clip_input)

        restored = self.net(input, degradation_features)
        val_loss = self.loss_fn(restored, target)

        temp_psnr, temp_ssim, N = compute_psnr_ssim(restored, target)
        output_path = os.path.join(options.output_path, sets_name[0])
        os.makedirs(output_path, exist_ok=True)
        output_path = os.path.join(output_path, type[0])
        os.makedirs(output_path, exist_ok=True)
        save_image_tensor(restored, os.path.join(output_path, name[0]))

        out_dict ={
            'dataloader_idx': dataloader_idx,
            'val_loss': val_loss.item(),
            'temp_psnr': temp_psnr,
            'temp_ssim': temp_ssim
        }

        self.validation_step_outputs.append(out_dict)

        return out_dict

    def on_validation_epoch_end(self):
        print("\n")

        if self.trainer.sanity_checking:
            print("Sanity check complete. Skipping validation metrics computation.")
            self.validation_step_outputs.clear()
            return

        metrics = {}
        total_psnr_sum = 0
        total_val_loss_sum = 0
        total_count = 0

        for output in self.validation_step_outputs:
            if not output or 'dataloader_idx' not in output:
                continue
            dataloader_idx = output['dataloader_idx']
            psnr = output['temp_psnr']
            ssim = output['temp_ssim']
            val_loss = output['val_loss']

            if dataloader_idx not in metrics:
                metrics[dataloader_idx] = {'psnr_sum': 0, 'ssim_sum': 0, 'val_loss_sum': 0, 'count': 0}

            metrics[dataloader_idx]['psnr_sum'] += psnr
            metrics[dataloader_idx]['ssim_sum'] += ssim
            metrics[dataloader_idx]['val_loss_sum'] += val_loss
            metrics[dataloader_idx]['count'] += 1

            total_psnr_sum += psnr
            total_val_loss_sum += val_loss
            total_count += 1

            # 计算平均值并记录
        for idx, metric in metrics.items():
            avg_psnr = metric['psnr_sum'] / metric['count']
            avg_ssim = metric['ssim_sum'] / metric['count']
            avg_val_loss = metric['val_loss_sum'] / metric['count']
            self.log(f'avg_val_psnr_dataloader_{idx}', avg_psnr, sync_dist=True)
            self.log(f'avg_val_ssim_dataloader_{idx}', avg_ssim, sync_dist=True)
            self.log(f'avg_val_loss_dataloader_{idx}', avg_val_loss, sync_dist=True)
            print(f"Dataloader {idx}, Loss: {avg_val_loss:.4f}, PSNR: {avg_psnr:.2f}, SSIM: {avg_ssim:.4f}")


        if total_count > 0:
          global_avg_psnr = total_psnr_sum / total_count
          global_avg_val_loss = total_val_loss_sum / total_count
          self.log('val_psnr',global_avg_psnr, sync_dist=True)
          self.log('val_loss', global_avg_val_loss, sync_dist=True)
        self.validation_step_outputs.clear()

class CustomProgressBar(TQDMProgressBar):
    def init_validation_tqdm(self):
        bar = super().init_validation_tqdm()
        bar.leave = False
        return bar

# %%
test_loaders = []
# test_path = './datasets/denoising_datasets/CBSD68/15_test_paths.txt'
# test_dataset = TestDataset_forIR(test_path, "Denoise15", "CBSD68")
# test_loaders.append(DataLoader(test_dataset, batch_size=1, num_workers=1))

# test_path = './datasets/denoising_datasets/CBSD68/25_test_paths.txt'
# test_dataset = TestDataset_forIR(test_path, "Denoise25", "CBSD68")
# test_loaders.append(DataLoader(test_dataset, batch_size=1, num_workers=1))

# test_path = './datasets/denoising_datasets/CBSD68/50_test_paths.txt'
# test_dataset = TestDataset_forIR(test_path, "Denoise50", "CBSD68")
# test_loaders.append(DataLoader(test_dataset, batch_size=1, num_workers=1))

# test_path = './datasets/dehazing_datasets/test_paths.txt'
# test_dataset = TestDataset_forIR(test_path, "Dehazing", "SOTS_outdoors")
# test_loaders.append(DataLoader(test_dataset, batch_size=1, num_workers=1))

# test_path = './datasets/deraining_datasets/Rain100L/test_paths.txt'
# test_dataset = TestDataset_forIR(test_path, "Deraining", "Rain100L")
# test_loaders.append(DataLoader(test_dataset, batch_size=1, num_workers=1))

test_path = './datasets/deblurring_datasets/GoPro/test_paths.txt'
test_dataset = TestDataset_forIR(test_path, "Deblurring", "GoPro")
test_loaders.append(DataLoader(test_dataset, batch_size=1, num_workers=1))

# test_path = './datasets/delowlight_datasets/LoL/test_paths.txt'
# test_dataset = TestDataset_forIR(test_path, "Delowlight", "LoL")
# test_loaders.append(DataLoader(test_dataset, batch_size=1, num_workers=1))

# %%
def main():
    tb_logger = TensorBoardLogger(
        save_dir="ckpt/Phase4/Logs",
        name=options.name,
        version="log_1"
    )

    drive_target_dir = f"ckpt/Phase4/Checkpoint/Class/{options.name}"
    os.makedirs(drive_target_dir, exist_ok=True)

    trainset = PromptTrainDataset(options)
    checkpoint_callback = ModelCheckpoint(dirpath = options.ckpt_path,every_n_epochs = 5,save_top_k=-1)
    trainloader = DataLoader(trainset, batch_size=options.batch_size, pin_memory=True, shuffle=True,
                             drop_last=True, num_workers=options.num_workers)
    model = DAdunModel()

    latest_callback = ModelCheckpoint(
        dirpath=drive_target_dir,
        filename="latest",
        every_n_epochs=1,
        save_top_k=1,
        monitor=None,
        save_on_train_epoch_end=True,
        enable_version_counter=False
    )

    best_callback = ModelCheckpoint(
        dirpath=drive_target_dir,
        filename="best-{epoch:03d}-{avg_val_psnr_dataloader_0:.3f}",
        monitor="avg_val_psnr_dataloader_0",
        mode="max",
        save_top_k=1
    )

    resume_path = os.path.join(drive_target_dir, "latest.ckpt")
    if os.path.exists(resume_path):
        print(f"[RESUME INFO] Found uncompleted runtime session checkpoint at {resume_path}. Resuming pipeline...")
    else:
        print("[RESUME INFO] Initialization fallback: no current checkpoint detected. Starting standard initialization.")
        resume_path = None

    trainer = pl.Trainer(
        max_epochs=options.epochs,
        accelerator="gpu",
        devices=options.num_gpus,
        logger=tb_logger,
        precision="16-mixed",
        callbacks=[latest_callback, best_callback, CustomProgressBar()],
        check_val_every_n_epoch=5
    )

    trainer.fit(model=model, train_dataloaders=trainloader, val_dataloaders=test_loaders, ckpt_path=resume_path)

    print("Best score:", best_callback.best_model_score)
    print("Best path:", best_callback.best_model_path)

if __name__ == '__main__':
    main()
