import Window from "@/components/shared/window.component";
import { AUTH } from "@/config/apps.config";

// const authError = [
//   {
//     type: "username",
//     message: "Username is required",
//   },
//   {
//     type: "password",
//     message: "Password is required",
//   },
//   {
//     type: "both",
//     message: "Username already exists",
//   },
// ];

export default function Auth() {
  return (
    <main>
      <Window {...AUTH} isActive>
        {/*ALSJHDA KJSDHAKJSDHKAHDKJA HD KJ AHDKADKJAHSDKJASHDKJASHDKAJSHDKJASHDK
        JASHD KJASHDKJASHDKASJHD AKJ SHD AKJSHDAKJSHD
        KAJSDHKJASDDDDDDDDDDDDDAKJDHAKJHDAKJHDA KJHDA KJHDA KJHDA KJHDA KJHDA
        KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA
        KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA
        KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA
        KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA
        KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA
        KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA
        KJHDA KJHDA KJHDA KJHDA KJHDA KJHDA KJ*/}
        <iframe
          src="https://gamegauntlets.com/"
          title="YouTube video player"
          className="w-full h-full"
          allow="link *; accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </Window>
    </main>
  );
}
