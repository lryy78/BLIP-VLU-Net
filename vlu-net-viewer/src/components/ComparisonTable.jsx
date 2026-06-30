import React, { useState, useMemo } from 'react';
import { getEnrichedData, taskLabels } from '../comparisonData';

/**
 * Formats a numeric value or returns 'N/A' for null/undefined.
 */
function fmt(val, decimals = 4) {
  if (val === null || val === undefined) return 'N/A';
  return Number(val).toFixed(decimals);
}

/**
 * Returns a colored class for the delta cell.
 */
function deltaClass(value) {
  if (value === null || value === undefined) return 'delta-na';
  if (value > 0.001) return 'delta-up';
  if (value < -0.001) return 'delta-down';
  return 'delta-equal';
}

function deltaArrow(value) {
  if (value === null || value === undefined) return '';
  if (value > 0.001) return ' ▲';
  if (value < -0.001) return ' ▼';
  return ' •';
}

/**
 * Group rows by task, then by dataset + type.
 */
function groupData(rows) {
  const grouped = {};
  for (const row of rows) {
    const key = row.task;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }
  return grouped;
}

export default function ComparisonTable({ onClose }) {
  const data = getEnrichedData();
  const grouped = groupData(data);
  const taskOrder = ['NHRBL', 'NHR', 'N', 'H', 'R', 'B', 'L'];

  // Extract unique types from data
  const allTypes = useMemo(() => {
    const types = new Set();
    data.forEach(row => types.add(row.type));
    return Array.from(types).sort();
  }, [data]);

  // Collapse state: default all collapsed
  const [collapsed, setCollapsed] = useState(
    Object.fromEntries(taskOrder.map(t => [t, true]))
  );

  const [selectedTypes, setSelectedTypes] = useState([]);

  const toggleSection = (task) => {
    setCollapsed(prev => ({ ...prev, [task]: !prev[task] }));
  };

  const handleTypeFilter = (type) => {
    if (selectedTypes.includes(type)) {
      // Deselect this type
      const newSelected = selectedTypes.filter(t => t !== type);
      setSelectedTypes(newSelected);
      
      if (newSelected.length === 0) {
        // No types selected - collapse all
        setCollapsed(Object.fromEntries(taskOrder.map(t => [t, true])));
      } else {
        // Update collapsed state based on remaining selected types
        const newCollapsed = {};
        taskOrder.forEach(task => {
          const taskRows = grouped[task] || [];
          const hasSelectedType = newSelected.some(selectedType => 
            taskRows.some(row => row.type === selectedType)
          );
          newCollapsed[task] = !hasSelectedType;
        });
        setCollapsed(newCollapsed);
      }
    } else {
      // Select this type (add to selection)
      const newSelected = [...selectedTypes, type];
      setSelectedTypes(newSelected);
      
      // Expand tasks that have any of the selected types
      const newCollapsed = {};
      taskOrder.forEach(task => {
        const taskRows = grouped[task] || [];
        const hasSelectedType = newSelected.some(selectedType => 
          taskRows.some(row => row.type === selectedType)
        );
        newCollapsed[task] = !hasSelectedType;
      });
      setCollapsed(newCollapsed);
    }
  };

  const clearFilter = () => {
    setSelectedTypes([]);
    setCollapsed(Object.fromEntries(taskOrder.map(t => [t, true])));
  };

  return (
    <div className="comparison-modal-overlay" onClick={onClose}>
      <div className="comparison-modal" onClick={e => e.stopPropagation()}>
        <div className="comparison-modal-header">
          <h2>PSNR / SSIM Comparison — VLU-Net vs BLIP-VLU-Net</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Type Filter Buttons */}
        <div className="type-filter-bar">
          <span className="filter-label">Filter by Type:</span>
          <button 
            className={`type-filter-btn ${selectedTypes.length === 0 ? 'active' : ''}`}
            onClick={clearFilter}
          >
            Reset
          </button>
          {allTypes.map(type => (
            <button
              key={type}
              className={`type-filter-btn ${selectedTypes.includes(type) ? 'active' : ''}`}
              onClick={() => handleTypeFilter(type)}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="comparison-modal-body">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="th-task">Task</th>
                <th className="th-dataset">Dataset</th>
                <th className="th-type">Type</th>
                <th colSpan={2} className="th-group-header th-vlu-header">VLU-Net</th>
                <th colSpan={2} className="th-group-header th-blip-header">BLIP-VLU-Net (ours)</th>
                <th colSpan={2} className="th-group-header th-delta-header">Difference</th>
              </tr>
              <tr>
                <th className="th-task"></th>
                <th className="th-dataset"></th>
                <th className="th-type"></th>
                <th className="th-val">PSNR</th>
                <th className="th-val">SSIM</th>
                <th className="th-val">PSNR</th>
                <th className="th-val">SSIM</th>
                <th className="th-delta">PSNR Δ</th>
                <th className="th-delta">SSIM Δ</th>
              </tr>
            </thead>
            <tbody>
              {taskOrder.map(task => {
                const rows = grouped[task] || [];
                if (rows.length === 0) return null;

                const isCollapsed = collapsed[task];
                const visibleRows = isCollapsed ? [] : rows;

                return (
                  <React.Fragment key={task}>
                    {/* Section header row */}
                    <tr className="section-header" onClick={() => toggleSection(task)}>
                      <td colSpan={9}>
                        <span className={`collapse-arrow ${isCollapsed ? '' : 'expanded'}`}>▶</span>
                        {taskLabels[task] || task}
                        <span className="row-count">({rows.length} rows)</span>
                      </td>
                    </tr>

                    {/* Hidden spacer to maintain alternating colors */}
                    {isCollapsed && (
                      <tr className="section-collapsed" style={{ display: 'none' }} />
                    )}

                    {/* Data rows - filter by selected types */}
                    {visibleRows
                      .filter(row => selectedTypes.length === 0 || selectedTypes.includes(row.type))
                      .map((row, idx) => {
                        const vluBetterPsnr = row.vlu_psnr > row.blip_psnr;
                        const vluBetterSsim = row.vlu_ssim > row.blip_ssim;
                        
                        return (
                          <tr key={`${task}-${idx}`} className="data-row">
                            <td>{taskLabels[row.task] || row.task}</td>
                            <td>{row.dataset}</td>
                            <td>{row.type}</td>
                            <td className={`val-cell ${vluBetterPsnr ? 'val-better' : 'val-worse'}`}>
                              {fmt(row.vlu_psnr, 2)}
                            </td>
                            <td className={`val-cell ${vluBetterSsim ? 'val-better' : 'val-worse'}`}>
                              {fmt(row.vlu_ssim, 4)}
                            </td>
                            <td className={`val-cell ${!vluBetterPsnr ? 'val-better' : 'val-worse'}`}>
                              {fmt(row.blip_psnr, 2)}
                            </td>
                            <td className={`val-cell ${!vluBetterSsim ? 'val-better' : 'val-worse'}`}>
                              {fmt(row.blip_ssim, 4)}
                            </td>
                            <td className={`delta-cell ${deltaClass(row.psnr_delta)}`}>
                              {row.psnr_delta !== null ? fmt(row.psnr_delta, 4) : 'N/A'}{deltaArrow(row.psnr_delta)}
                            </td>
                            <td className={`delta-cell ${deltaClass(row.ssim_delta)}`}>
                              {row.ssim_delta !== null ? fmt(row.ssim_delta, 4) : 'N/A'}{deltaArrow(row.ssim_delta)}
                            </td>
                          </tr>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="comparison-modal-footer">
          <span className="legend">
            <span className="legend-item"><span className="dot delta-up"></span> Improvement</span>
            <span className="legend-item"><span className="dot delta-down"></span> Degradation</span>
            <span className="legend-item"><span className="dot delta-equal"></span> No change</span>
          </span>
          <button className="close-btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}