import os
os.environ["CUDA_VISIBLE_DEVICES"] = "0"
os.environ["WANDB_DISABLED"] = "true"
os.environ["WANDB_MODE"] = "disabled"

import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import numpy as np
import argparse
import open_clip
from net.Final import VLUNet
from net.clip import DA_adapter
from utils.image_utils import crop_img

OPENAI_DATASET_MEAN = (0.48145466, 0.4578275, 0.40821073)
OPENAI_DATASET_STD = (0.26862954, 0.26130258, 0.27577711)

# Degradation type to ID mapping (same as in dataset_utils_clip.py)
de_type_map = {
    'denoise_15': 0,
    'denoise_25': 1,
    'denoise_50': 2,
    'derain': 3,
    'dehaze': 4,
    'deblur': 5,
    'delowlight': 6
}

def load_model(task, de_type):
    """Load the appropriate model based on task and degradation type - using BLIP VLU model"""
    # Map task to checkpoint filename
    task_to_checkpoint = {
        'N': 'single_noise_blip_vlunet.ckpt',
        'R': 'single_rain_blip_vlunet.ckpt',
        'H': 'single_haze_blip_vlunet.ckpt',
        'B': 'single_blur_blip_vlunet.ckpt',
        'L': 'single_lowlight_blip_vlunet.ckpt'
    }
    
    checkpoint_filename = task_to_checkpoint.get(task)
    if not checkpoint_filename:
        raise ValueError(f"Unknown task: {task}")
    
    checkpoint_path = f'./blip_vlunet_pretrained_ckpt/{checkpoint_filename}'
    
    # Create model
    model = VLUNet(de_dim=7)
    
    # Load CLIP with BLIP tuning
    clip, _, _ = open_clip.create_model_and_transforms('ViT-B-32', pretrained='laion2b_s34b_b79k')
    model_degradation = DA_adapter(clip)
    model_degradation.set_frozen()
    pth_file = "./blip_vlunet_pretrained_ckpt/blip_vlunet_clip_tuned.pth"
    checkpoint_clip = torch.load(pth_file, map_location=torch.device('cpu'))
    model_degradation.load_state_dict(checkpoint_clip['learnable_params'], strict=False)
    
    # Load main BLIP VLU model checkpoint
    checkpoint = torch.load(checkpoint_path, map_location=torch.device('cpu'))
    state_dict = checkpoint['state_dict']
    
    # Remove 'net.' prefix and filter out model_degradation keys
    new_state_dict = {}
    for key, value in state_dict.items():
        # Skip model_degradation keys - they are loaded separately
        if key.startswith('model_degradation.'):
            continue
        # Remove 'net.' prefix from main model keys
        if key.startswith('net.'):
            new_key = key[4:]  # Remove 'net.' prefix
            new_state_dict[new_key] = value
        else:
            new_state_dict[key] = value
    
    model.load_state_dict(new_state_dict)
    
    # Set to eval mode
    model.eval()
    model_degradation.eval()
    
    return model, model_degradation

def preprocess_image(image_path):
    """Preprocess image for model input"""
    # Load and convert to RGB
    image = Image.open(image_path).convert('RGB')
    image_np = np.array(image)
    
    # Crop to base-16 alignment (same as training)
    image_cropped = crop_img(image_np, base=16)
    
    # Convert to tensor
    transform = transforms.Compose([
        transforms.ToTensor()
    ])
    image_tensor = transform(image_cropped).unsqueeze(0)  # Add batch dimension
    
    # Prepare CLIP input
    normalize = transforms.Normalize(mean=OPENAI_DATASET_MEAN, std=OPENAI_DATASET_STD)
    clip_transform = transforms.Compose([
        transforms.Resize(224, interpolation=transforms.InterpolationMode.BICUBIC),
        transforms.CenterCrop(224),
        normalize
    ])
    clip_input = clip_transform(image_tensor)
    
    return image_tensor, clip_input

def restore_image(model, model_degradation, image_tensor, clip_input, de_type_id):
    """Run restoration on a single image"""
    with torch.no_grad():
        # Get degradation features from CLIP
        degradation_features = model_degradation.get_image_features(clip_input)
        
        # Run restoration
        restored = model(image_tensor, degradation_features)
        
        # Clamp to valid range
        restored = torch.clamp(restored, 0, 1)
        
    return restored

def save_image(tensor, output_path):
    """Save tensor as image"""
    # Convert tensor to numpy
    image_np = tensor.squeeze(0).cpu().numpy()
    image_np = (image_np * 255).astype(np.uint8)
    image_np = np.transpose(image_np, (1, 2, 0))  # CHW to HWC
    
    # Save image
    image = Image.fromarray(image_np)
    image.save(output_path)
    print(f"Saved restored image to: {output_path}")

def main():
    parser = argparse.ArgumentParser(description='Single image restoration using VLU-Net')
    parser.add_argument('--input', type=str, required=True, help='Input image path')
    parser.add_argument('--output', type=str, required=True, help='Output image path')
    parser.add_argument('--task', type=str, required=True, choices=['N', 'R', 'H', 'B', 'L'], 
                       help='Task type: N=noise, R=rain, H=haze, B=blur, L=lowlight')
    parser.add_argument('--de_type', type=str, required=True, 
                       choices=['denoise_15', 'denoise_25', 'denoise_50', 'derain', 'dehaze', 'deblur', 'delowlight'],
                       help='Degradation type')
    parser.add_argument('--level', type=str, default='', help='Level name (for reference)')
    
    args = parser.parse_args()
    
    print(f"Input: {args.input}")
    print(f"Output: {args.output}")
    print(f"Task: {args.task}, Degradation: {args.de_type}")
    
    # Get degradation type ID
    de_type_id = de_type_map[args.de_type]
    de_type_tensor = torch.tensor([de_type_id])
    
    # Load model
    print("Loading model...")
    model, model_degradation = load_model(args.task, args.de_type)
    print("Model loaded successfully")
    
    # Preprocess image
    print("Preprocessing image...")
    image_tensor, clip_input = preprocess_image(args.input)
    print(f"Image shape: {image_tensor.shape}")
    
    # Run restoration
    print("Running restoration...")
    restored = restore_image(model, model_degradation, image_tensor, clip_input, de_type_id)
    
    # Save result
    save_image(restored, args.output)
    
    print("Restoration completed successfully!")

if __name__ == '__main__':
    main()