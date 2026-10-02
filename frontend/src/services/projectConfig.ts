import fabricEnvironment from '../../../environment/fabric-version.env?raw';

function readConfigValue(source: string, key: string): string | null {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.match(new RegExp(`^\\s*${escapedKey}=(.+)\\s*$`, 'm'))?.[1]?.trim() || null;
}

export const configuredFabricVersion = readConfigValue(fabricEnvironment, 'FABRIC_VERSION');
