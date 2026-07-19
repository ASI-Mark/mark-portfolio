// 极淡纸纹颗粒：整站铺一层 feTurbulence 噪点，multiply 融进米白纸面。
// 真纸感靠纹理不靠色号。固定层、不挡交互、成本极低。
const GRAIN =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'>
      <filter id='n'>
        <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
        <feColorMatrix type='saturate' values='0'/>
      </filter>
      <rect width='100%' height='100%' filter='url(#n)'/>
    </svg>`
  );

export default function PaperGrain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90]"
      style={{
        backgroundImage: `url("${GRAIN}")`,
        backgroundSize: "180px 180px",
        mixBlendMode: "multiply",
        opacity: 0.04,
      }}
    />
  );
}
