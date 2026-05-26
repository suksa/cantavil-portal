interface Props {
  className?: string;
}

// The red ID badge (three horizontal bars) from logo_white.svg, isolated.
// Original viewBox carved out: 0 0 41.54 50.67.
export default function IdMark({ className }: Props) {
  return (
    <svg
      viewBox="0 0 41.54 50.67"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path fill="#f12a37" d="M41.54 35.47H0v15.2h41.54z" />
      <path fill="#f12a37" d="M41.54 0H0v10.13h41.54z" />
      <path fill="#f12a37" d="M41.54 20.27H0v5.07h41.54z" />
    </svg>
  );
}
