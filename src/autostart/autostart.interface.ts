export interface AutostartService {
  name: string; // Human-readable name for user display
  canActivate(): boolean;
  install(command: string): Promise<boolean>;
  uninstall(): Promise<boolean>;
}
