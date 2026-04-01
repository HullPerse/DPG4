export function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*?v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = new RegExp(pattern).exec(url);
    if (match) {
      return match[1];
    }
  }

  return null;
}

export function isYouTubeLink(text: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(
    text,
  );
}

export function parseReviewText(text: string): Array<{
  type: "text" | "youtube";
  content: string;
  videoId?: string;
}> {
  const result: Array<{
    type: "text" | "youtube";
    content: string;
    videoId?: string;
  }> = [];

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches: Array<{
    url: string;
    startIndex: number;
    endIndex: number;
  }> = [];

  for (const match of text.matchAll(urlRegex)) {
    if (isYouTubeLink(match[0])) {
      matches.push({
        url: match[0],
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  }

  if (matches.length === 0) {
    result.push({ type: "text", content: text });
  } else {
    let lastIndex = 0;
    for (const urlMatch of matches) {
      if (urlMatch.startIndex > lastIndex) {
        result.push({
          type: "text",
          content: text.substring(lastIndex, urlMatch.startIndex),
        });
      }

      const videoId = extractYouTubeId(urlMatch.url);
      if (videoId) {
        result.push({
          type: "youtube",
          content: urlMatch.url,
          videoId,
        });
      } else {
        result.push({
          type: "text",
          content: urlMatch.url,
        });
      }

      lastIndex = urlMatch.endIndex;
    }

    if (lastIndex < text.length) {
      result.push({
        type: "text",
        content: text.substring(lastIndex),
      });
    }
  }

  return result;
}
