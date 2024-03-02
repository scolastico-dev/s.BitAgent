export interface AutostartService {
  name: string; // Human-readable name for user display
  canActivate(): Promise<boolean>;
  install(command: string, name: string, marker: string): Promise<boolean>;
  uninstall(marker: string): Promise<boolean>;
  isInstalled(marker: string): Promise<boolean>;
}
