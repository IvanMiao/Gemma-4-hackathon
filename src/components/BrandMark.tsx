export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center overflow-hidden rounded-xl border border-lime/45"
      style={{
        width: size,
        height: size,
        background: 'linear-gradient(145deg, rgb(185 255 92 / 17%), rgb(143 124 255 / 10%))',
        boxShadow: 'inset 0 0 20px rgb(185 255 92 / 8%), 0 0 24px rgb(185 255 92 / 7%)',
      }}
      aria-hidden="true"
    >
      <i
        className="absolute h-[13%] w-[45%] rounded-full bg-lime"
        style={{ transform: 'rotate(-32deg) translateY(-40%)' }}
      />
      <i
        className="absolute h-[13%] w-[45%] rounded-full bg-[#8f7cff]"
        style={{ transform: 'rotate(-32deg) translateY(40%)' }}
      />
    </span>
  )
}
