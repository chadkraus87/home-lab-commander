import type {
  ContainerProvider,
  DeviceProvider,
  ServiceProvider,
} from "@/domain/providers";
import type { ContainerRecord, Device, MonitoredService } from "@/domain/types";
import { createDemoSnapshot } from "@/simulation/demo-data";

export class DemoProvider
  implements DeviceProvider, ServiceProvider, ContainerProvider
{
  readonly id = "deterministic-demo";
  private readonly snapshot = createDemoSnapshot();

  async available(): Promise<boolean> {
    return true;
  }
  async listDevices(): Promise<Device[]> {
    return structuredClone(this.snapshot.devices);
  }
  async listServices(): Promise<MonitoredService[]> {
    return structuredClone(this.snapshot.services);
  }
  async listContainers(): Promise<ContainerRecord[]> {
    return structuredClone(this.snapshot.containers);
  }
}
