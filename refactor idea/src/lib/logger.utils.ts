import { resolveBackendPath } from "./path.utils";

export default class Logger {
  private author: string;

  constructor(author: string = "SYSTEM") {
    this.author = author.toUpperCase();
  }

  private get timestamp(): string {
    return new Date().toLocaleTimeString("en-US", {
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  private format(message: string): string {
    return `[${this.timestamp}] [${this.author}] ${message}`;
  }

  setAuthor(author: string): this {
    this.author = author.toUpperCase();
    return this;
  }

  log = (message: string) => console.log(this.format(message));
  debug = (message: string) => console.debug(this.format(message));
  info = (message: string) => console.info(this.format(message));
  warn = (message: string) => console.warn(this.format(message));
  error = (message: string) => console.error(this.format(message));
  clear = () => console.clear();
}

export const iluhaAscii = `
  ⠀⠀⠀⠀⠀⠀⠀⢀⣰⣶⣶⣾⣦⣄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  ⠀⠀⠀⠀⠀⠀⠀⣼⣿⡿⠛⠋⠉⠛⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  ⠀⠀⠀⢠⡆⠀⠀⠸⢻⣤⡔⢰⣦⠄⠘⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
  ⠀⠀⠀⢸⡇⠀⣠⠷⣿⣿⣇⢀⠁⠀⠀⠃⠀⠀⠀⠀⠀⠀⠀⠀⠀
  ⢤⣿⡀⢭⣷⡿⠋⠀⠙⣿⣿⣦⡄⠀⠀⠀⠤⠀⠀⠀⠀⠀⠀⠀⠀
  ⢾⣋⣽⠈⢁⠀⠀⠀⠀⠈⠻⣯⣄⣤⢀⠈⠠⠂⠈⠐⠀⠀⠀⠀⠀
  ⢻⣿⣿⡟⠂⠀⠀⠀⠀⠀⣤⢻⣿⡿⢣⡔⠢⡜⠤⡀⠀⠀⠀⠀⠈
  ⢨⣿⡟⢃⠀⠀⠀⠀⢀⣞⡶⣣⠚⣤⢣⡜⡱⢎⡳⢨⡄⠀⠀⠀⠀
  ⢺⣿⠁⠆⡀⡀⠢⢰⢻⡜⡗⢧⡹⣜⠣⡜⢥⠣⣝⠀⣞⡄⠀⠀⠀
  ⣽⣿⡄⠂⢸⢐⣠⣤⣿⡞⣿⠨⡕⢊⠱⣜⢫⡇⢜⣳⡜⡼⡀⠀⠀
  ⠸⣿⣷⣈⢆⣿⠿⠋⠁⢸⣹⢧⠘⣡⢻⢬⣳⢧⢈⠶⡹⣲⠱⠀⠀
  ⠀⠿⠿⠿⠋⠁⠀⠀⠀⢰⢯⣟⡾⣵⢯⣞⣭⢷⡂⢇⠳⣧⢛⡠⠀
  `;

export const LOG_FILE = resolveBackendPath("logs", "server.log");
