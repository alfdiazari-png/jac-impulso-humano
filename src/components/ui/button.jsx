export function Button({ children, className = "", ...props }) {
  return (
    <button className={`inline-flex items-center justify-center px-4 py-2 ${className}`} {...props}>
      {children}
    </button>
  );
}