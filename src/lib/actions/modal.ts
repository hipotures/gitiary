/**
 * Opens a <dialog> as a native modal while it is mounted (`{#if open}<dialog use:modal={onDismiss}>`).
 *
 * The browser provides the dialog role, the inert page, focus containment and Esc. `onDismiss` runs when the user
 * dismisses the dialog (Esc, back gesture, or a click outside with closedby="any"), so the caller clears the state
 * that keeps it mounted. The browser returns focus to the opener when the dialog closes itself; when the caller
 * unmounts it (Cancel, Save), the node can be gone before close() runs, so focus is restored here in that case.
 */
export function modal(dialog: HTMLDialogElement, onDismiss: () => void) {
	let dismiss = onDismiss;
	const onClose = () => dismiss();
	dialog.addEventListener('close', onClose);

	// closedby="any" is not in every browser (Safari): add click-outside dismissal there. The pointer position is
	// tested, not the event target, because the dialog itself is the target for clicks on its own padding.
	let pressedOutside = false;
	const outside = (event: PointerEvent) => {
		const r = dialog.getBoundingClientRect();
		return event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom;
	};
	const onDown = (event: PointerEvent) => (pressedOutside = outside(event));
	const onUp = (event: PointerEvent) => {
		if (pressedOutside && outside(event)) dialog.close();
	};
	const fallback = dialog.getAttribute('closedby') === 'any' && !('closedBy' in HTMLDialogElement.prototype);
	if (fallback) {
		dialog.addEventListener('pointerdown', onDown);
		dialog.addEventListener('pointerup', onUp);
	}

	const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	dialog.showModal();

	return {
		update(next: () => void) {
			dismiss = next;
		},
		destroy() {
			dialog.removeEventListener('close', onClose);
			dialog.removeEventListener('pointerdown', onDown);
			dialog.removeEventListener('pointerup', onUp);
			if (dialog.open) dialog.close();
			queueMicrotask(() => {
				const lost = !document.activeElement || document.activeElement === document.body || !document.activeElement.isConnected;
				if (lost && opener?.isConnected) opener.focus();
			});
		}
	};
}
