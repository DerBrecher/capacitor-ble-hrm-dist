import { BleClient, numberToUUID } from '@capacitor-community/bluetooth-le';

const HEART_RATE_SERVICE = numberToUUID(0x180d);           // org.bluetooth.service.heart_rate
const HR_MEASUREMENT_CHAR = numberToUUID(0x2a37);          // org.bluetooth.characteristic.heart_rate_measurement

const connectBtn = document.getElementById('connect') as HTMLButtonElement;
const disconnectBtn = document.getElementById('disconnect') as HTMLButtonElement;
const statusEl = document.getElementById('status')!;
const bpmEl = document.getElementById('bpm')!;

let deviceId: string | null = null;

function setStatus(msg: string) { statusEl.textContent = msg; }
function setBpm(v: number | null) { bpmEl.textContent = v == null ? '--' : String(v); }

function parseHeartRate(value: DataView): number {
  // Spec: first byte = flags; bit0 tells if HR value is 8 or 16-bit. :contentReference[oaicite:1]{index=1}
  const flags = value.getUint8(0);
  const is16 = (flags & 0x01) === 0x01;
  return is16 ? value.getUint16(1, true) : value.getUint8(1);
}

connectBtn.addEventListener('click', async () => {
  try {
    await BleClient.initialize({ androidNeverForLocation: true });

    setStatus('Scanning for heart rate monitors…');
    const device = await BleClient.requestDevice({
      services: [HEART_RATE_SERVICE],
    }); // system picker UI

    setStatus('Connecting…');
    await BleClient.connect(device.deviceId, onDisconnect);
    deviceId = device.deviceId;

    setStatus(`Connected to ${device.name ?? 'device'}. Subscribing…`);
    await BleClient.startNotifications(deviceId, HEART_RATE_SERVICE, HR_MEASUREMENT_CHAR, (dv) => {
      const bpm = parseHeartRate(dv);
      setBpm(bpm);
    });
    setStatus(`Connected to ${device.name ?? 'device'}.`);

    connectBtn.disabled = true;
    disconnectBtn.disabled = false;
  } catch (e: any) {
    console.error(e);
    setStatus(e?.message ?? String(e));
    await safeDisconnect();
  }
});

disconnectBtn.addEventListener('click', async () => {
  await safeDisconnect();
});

async function safeDisconnect() {
  if (!deviceId) return;
  try {
    await BleClient.stopNotifications(deviceId, HEART_RATE_SERVICE, HR_MEASUREMENT_CHAR);
  } catch {}
  try {
    await BleClient.disconnect(deviceId);
  } catch {}
  deviceId = null;
  setBpm(null);
  setStatus('Disconnected');
  connectBtn.disabled = false;
  disconnectBtn.disabled = true;
}

function onDisconnect(id: string) {
  if (id === deviceId) {
    deviceId = null;
    setBpm(null);
    setStatus('Device disconnected');
    connectBtn.disabled = false;
    disconnectBtn.disabled = true;
  }
}