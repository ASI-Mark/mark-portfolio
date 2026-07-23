import { Fragment } from "react";

// 把文本里 **包起来** 的核心词染成暗红（内核跳出来）。其余原样。
export default function AccentText({ text }: { text: string }) {
  const parts = text.split("**");
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <em key={i} className="not-italic text-accent">
            {p}
          </em>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        )
      )}
    </>
  );
}
