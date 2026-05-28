import { startTransition, useCallback, useState } from "react";
import AdsApi from "@/api/ads.api";
import { Ads } from "@/types/ads.d";
import { useUserStore } from "@/store/user.store";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSubscription } from "@/hooks/subscription.hook";
import {
  SmallLoader,
  WindowLoader,
} from "@/components/shared/loader.component";
import { WindowError } from "@/components/shared/error.component";
import {
  NetworkIcon,
  Plus,
  Image as ImageIcon,
  Trash,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button.component";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.component";
import { Input } from "@/components/ui/input.component";
import { ImageUploader } from "@/components/shared/uploader.component";
import { AudioUploader } from "@/components/shared/audio.component";
import ImageComponent from "@/components/shared/image.component";
import { getFileUrl } from "@/api/client.api";

const adsApi = new AdsApi();

function AdTab() {
  const queryClient = useQueryClient();
  const user = useUserStore((state) => state.user);

  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioVolume, setAudioVolume] = useState<number>(1);
  const [compressedAudioSize, setCompressedAudioSize] = useState<number | null>(
    null,
  );
  const [text, setText] = useState<string>("");
  const [audioLoad, setAudioLoad] = useState<boolean>(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["adsTab"],
    queryFn: async (): Promise<Ads[]> => {
      const data = await adsApi.getAds();
      return data.filter((i) => i.owner.id === user?.id);
    },
  });

  const invalidateQuery = useCallback(() => {
    startTransition(() => {
      queryClient.invalidateQueries({
        queryKey: ["adsTab"],
        refetchType: "all",
      });
    });
  }, [queryClient]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setImageFile(null);
      setAudioFile(null);
      setText("");
      setCompressedAudioSize(null);
      setAudioVolume(1);
    }
    setIsOpen(open);
  };

  useSubscription("ads", "*", invalidateQuery);

  if (isLoading) return <WindowLoader />;
  if (isError)
    return (
      <WindowError
        error={new Error("Произошла ошибка")}
        icon={<NetworkIcon />}
        refresh={refetch}
        button
      />
    );

  const handleRemove = async (id: string) => {
    setLoading(true);

    await adsApi.removeAd(id);

    setLoading(false);
  };

  const compressAudio = async (file: File): Promise<File> => {
    const audioContext = new AudioContext();
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

    let bufferToProcess = audioBuffer;

    if (audioVolume !== 1) {
      bufferToProcess = applyVolume(audioBuffer, audioVolume);
    }

    const needsCompression = file.size > 2 * 1024 * 1024;
    const needsReencode = audioVolume !== 1;

    if (!needsCompression && !needsReencode) return file;

    const offlineContext = new OfflineAudioContext(
      bufferToProcess.numberOfChannels,
      bufferToProcess.length,
      needsCompression
        ? bufferToProcess.sampleRate / 2
        : bufferToProcess.sampleRate,
    );

    const source = offlineContext.createBufferSource();
    source.buffer = bufferToProcess;
    source.connect(offlineContext.destination);
    source.start();

    const renderedBuffer = await offlineContext.startRendering();

    const wavBlob = audioBufferToWav(renderedBuffer);
    const resultFile = new File([wavBlob], file.name, { type: "audio/wav" });
    setCompressedAudioSize(resultFile.size);
    return resultFile;
  };

  const applyVolume = (
    audioBuffer: AudioBuffer,
    volume: number,
  ): AudioBuffer => {
    const newBuffer = new AudioBuffer({
      length: audioBuffer.length,
      numberOfChannels: audioBuffer.numberOfChannels,
      sampleRate: audioBuffer.sampleRate,
    });

    for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
      const inputData = audioBuffer.getChannelData(channel);
      const outputData = newBuffer.getChannelData(channel);
      for (let i = 0; i < audioBuffer.length; i++) {
        outputData[i] = inputData[i] * volume;
      }
    }

    return newBuffer;
  };

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numChannels = buffer.numberOfChannels;
    const length = buffer.length * numChannels * 2 + 44;
    const bufferOut = new ArrayBuffer(length);
    const view = new DataView(bufferOut);

    writeString(view, 0, "RIFF");
    view.setUint32(4, length - 8, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, buffer.sampleRate, true);
    view.setUint32(28, buffer.sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, "data");
    view.setUint32(40, buffer.length * numChannels * 2, true);

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(
          -1,
          Math.min(1, buffer.getChannelData(channel)[i]),
        );
        view.setInt16(
          offset,
          sample < 0 ? sample * 0x8000 : sample * 0x7fff,
          true,
        );
        offset += 2;
      }
    }

    return new Blob([bufferOut], { type: "audio/wav" });
  };

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  const handleSubmit = async () => {
    setLoading(true);

    const compressedAudio = audioFile
      ? await compressAudio(audioFile)
      : undefined;

    const adData = {
      owner: {
        username: user?.username,
        id: user?.id,
      },
      image: imageFile,
      audio: compressedAudio,
      text: text,
    } as Ads;

    await adsApi.createAd(adData);

    setIsOpen(false);
    setAudioFile(null);
    setCompressedAudioSize(null);
    setAudioVolume(1);
    setLoading(false);
  };

  return (
    <main className="flex flex-col gap-2 w-full h-full pt-2">
      <Button
        variant="ghost"
        className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
        onClick={() => setIsOpen(true)}
      >
        <Plus className="size-10" />
        <div className="flex flex-col w-full items-start overflow-hidden">
          <span className="ml-2 font-bold text-xl">Создать рекламу</span>
          <span className="ml-2 text-sm font-light text-muted truncate line-clamp-1">
            Создайте новую рекламу
          </span>
        </div>
      </Button>

      <section className="flex flex-col w-full overflow-y-auto gap-2">
        {data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted">
            <ImageIcon className="size-12 mb-2 opacity-50" />
            <span>Реклама отсутствует</span>
          </div>
        ) : (
          data?.map((item) => (
            <div
              key={item.id}
              className="w-full h-18 border-2 border-highlight-high flex flex-row items-center justify-start"
            >
              {item.image && (
                <ImageComponent
                  src={`${getFileUrl(item)}`}
                  alt="ad image"
                  className="h-16 w-16 min-w-16 min-h-16 border-2 border-highlight-high ml-1"
                />
              )}
              <div className="flex flex-col flex-1 ml-2">
                <span className="line-clamp-2 ">{item.text}</span>
              </div>

              {item.audio && (
                <Button
                  variant="info"
                  size="icon"
                  className="ml-auto mr-2 size-13"
                  onClick={() => {
                    setAudioLoad(true);
                    const audio = new Audio(
                      `${getFileUrl(item, "audio")}`,
                    );
                    audio.onended = () => setAudioLoad(false);
                    audio.onerror = () => setAudioLoad(false);
                    audio.play().catch(() => setAudioLoad(false));
                  }}
                  disabled={audioLoad}
                >
                  {audioLoad ? <SmallLoader /> : <Play />}
                </Button>
              )}

              <Button
                variant="error"
                size="icon"
                className="ml-auto mr-2 size-13"
                onClick={() => handleRemove(String(item.id))}
              >
                {loading ? <SmallLoader /> : <Trash />}
              </Button>
            </div>
          ))
        )}
      </section>

      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Создать рекламу</DialogTitle>
            <DialogDescription>
              Загрузите изображение и добавьте текст рекламы
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <ImageUploader
              value={imageFile}
              onChange={setImageFile}
              className="w-full"
            />

            <AudioUploader
              value={audioFile}
              onChange={(file) => {
                setAudioFile(file);
                setCompressedAudioSize(null);
              }}
              volume={audioVolume}
              onVolumeChange={setAudioVolume}
              compressedSize={compressedAudioSize ?? undefined}
              className="w-full"
            />

            <Input
              placeholder="Текст рекламы..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={200}
            />
          </div>

          <DialogFooter className="bg-card">
            <Button
              variant="error"
              onClick={() => setIsOpen(false)}
              disabled={loading}
            >
              {loading ? <SmallLoader /> : "ОТМЕНИТЬ"}
            </Button>
            <Button
              variant="success"
              onClick={handleSubmit}
              disabled={!text || !imageFile}
            >
              {loading ? <SmallLoader /> : "СОЗДАТЬ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

export default AdTab;
