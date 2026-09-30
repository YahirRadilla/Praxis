function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-[12px] text-red-600 mt-1 mb-0">{message}</p>;
}

export default FieldError;
