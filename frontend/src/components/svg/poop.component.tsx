import { SvgWrapper } from "@/components/ui/svg.component";

const PoopSvg = ({ className }: { className?: string }) => {
  return (
    <SvgWrapper
      viewBox="0 0 24 24"
      width={28}
      height={28}
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      title="Poop Emoji"
      decorative={className?.includes("decorative")}
      className={className}
    >
      <path d="M11 4c2 0 3.5 1.5 3.5 4l.164 0a2.5 2.5 0 0 1 2.196 3.32a3 3 0 0 1 1.615 3.063a3 3 0 0 1 -1.299 5.607l-.176 0h-10a3 3 0 0 1 -1.474 -5.613a3 3 0 0 1 1.615 -3.062a2.5 2.5 0 0 1 2.195 -3.32l.164 0c1.5 0 2.5 -2 1.5 -4z" />
    </SvgWrapper>
  );
};

export default PoopSvg;
