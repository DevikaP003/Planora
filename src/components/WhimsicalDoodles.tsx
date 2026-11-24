export function PlanoraLogoMark({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="14" cy="14" r="13" fill="#A94D67" />
      <path
        d="M8.5 14.5L20 9L15.5 20.5L13.2 15.6L8.5 14.5Z"
        fill="#FFFFFF"
        stroke="#FFFFFF"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 19.5C8 18.2 9.5 17.5 11.2 17.2"
        stroke="#FFD166"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

export function WhimsicalFlightPath({ className = "w-full h-10" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 260 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M6 34C52 10 92 38 140 22C175 10 205 26 244 12"
        stroke="#FF9F68"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeDasharray="4 5"
        opacity="0.85"
      />
      <path
        d="M238 11L252 8L244 20L242 14.5L238 11Z"
        fill="#F4775B"
      />
    </svg>
  );
}

export function CompassSticker({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="20" cy="20" r="17" fill="#FFF4D2" stroke="#FFD166" strokeWidth="1.75" />
      <circle cx="20" cy="20" r="12.5" stroke="#FF9F68" strokeWidth="1.1" strokeDasharray="2 2.5" />
      <path d="M24.5 15.5L21.8 21.8L15.5 24.5L18.2 18.2L24.5 15.5Z" fill="#A94D67" />
      <circle cx="20" cy="20" r="1.75" fill="#3B2723" />
    </svg>
  );
}

export function TicketStubDoodle({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="4"
        y="9"
        width="28"
        height="18"
        rx="4"
        fill="#FFF4D2"
        stroke="#F4775B"
        strokeWidth="1.5"
      />
      <path
        d="M14 9.5V26.5"
        stroke="#FF9F68"
        strokeWidth="1.3"
        strokeDasharray="2.5 2.5"
      />
      <circle cx="9" cy="18" r="2.2" fill="#A94D67" />
      <path d="M18 15.5H27" stroke="#3B2723" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 20.5H24" stroke="#6E524B" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function SunCloudDoodle({ className = "w-7 h-7" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="13" cy="13" r="6" fill="#FFD166" stroke="#3B2723" strokeWidth="1.4" />
      <path
        d="M13 4V5.5M6.6 6.6L7.7 7.7M4 13H5.5M19.4 6.6L18.3 7.7"
        stroke="#F4775B"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M11.5 24H23.5C25.4 24 27 22.4 27 20.5C27 18.7 25.6 17.2 23.8 17C23.2 14.7 21.1 13 18.6 13C15.7 13 13.4 15.2 13.2 18C11.4 18.2 10 19.7 10 21.5C10 22.9 10.7 24 11.5 24Z"
        fill="#FFFCF7"
        stroke="#3B2723"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
