import { timingSafeEqual } from "crypto";
import * as readline from "readline";
import { IResourceData } from "./Peer";

class FilePicker {
  private reader: readline.Interface;

  constructor(private files: Record<string, IResourceData>) {
    this.reader = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  showOptions(): Promise<IFileOption | null> {
    this.printOptions();
    return new Promise((resolve) => {
      this.reader.question(
        "\nChoose one of the resources above, or any other number to cancel. \n",
        (answer) => {
          const index = Number(answer) - 1;
          const resources = Object.keys(this.files);
          if (!resources[index]) {
            console.log("\nExited File Picker.\n");

            resolve(null);
          }
          const hash = resources[index];
          resolve({
            hash,
            ...this.files[hash],
          });
        }
      );
    });
  }

  dismiss() {
    this.reader.close();
  }

  private printOptions() {
    console.log("\n\n*** SEARCH RESULTS ***\n");
    Object.values(this.files).forEach((resource, index) => {
      console.log(`${index + 1} - ${resource.fileName}`);
    });
  }
}

export default FilePicker;

export interface IFileOption extends IResourceData {
  hash: string;
}
