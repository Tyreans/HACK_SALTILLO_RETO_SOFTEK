import './SuccessToast.css';

export default function SuccessToast({ message }) {
  return (
    <div className="success-toast" role="status" aria-live="polite">
      <span className="success-toast__icon" aria-hidden="true">
        ✓
      </span>
      <span>{message}</span>
    </div>
  );
}
