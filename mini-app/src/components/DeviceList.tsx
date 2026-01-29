import React from 'react';
import { LocalDevice } from '../db/schema';

interface DeviceListProps {
  devices: LocalDevice[];
  onSelect: (device: LocalDevice) => void;
}

const DeviceList: React.FC<DeviceListProps> = ({ devices, onSelect }) => {
  return (
    <div className="device-list">
      <h3>Выберите аппарат</h3>
      {devices.length === 0 ? (
        <p>Аппараты не найдены</p>
      ) : (
        devices.map(device => (
          <div 
            key={device.id} 
            className="card" 
            onClick={() => onSelect(device)} 
            style={{ cursor: 'pointer' }}
          >
            <strong>{device.name}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '14px', color: 'var(--tg-theme-hint-color)' }}>
              {device.location}
            </p>
          </div>
        ))
      )}
    </div>
  );
};

export default DeviceList;
