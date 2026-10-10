import { useEffect, useState } from 'react';
import './App.css';
import RestockPopup from './components/RestockPopup';
import SuccessToast from './components/SuccessToast';

const initialProducts = [
	{
		id: 'cafe',
		name: 'Café espresso',
		category: 'Grano · Bolsa 1kg',
		status: 'Bajo stock',
		stock: 'Stock actual: 12 unidades | Stock objetivo: 50 uds',
		date: '14 oct 2026',
		tone: 'coffee',
		emoji: '☕',
		quantity: 38,
		action: 'idle',
	},
	{
		id: 'aguacate',
		name: 'Aguacates (KG)',
		category: 'Materia prima',
		status: 'Bajo stock',
		stock: 'Stock actual: 8 kg | Stock objetivo: 25 kg',
		date: '17 oct 2026',
		tone: 'avocado',
		emoji: '🥑',
		quantity: 17,
		action: 'idle',
	},
	{
		id: 'platano',
		name: 'Batido de plátano',
		category: 'Ingredientes',
		status: 'Bajo stock',
		stock: 'Stock actual: 5 kg | Stock objetivo: 15 kg',
		date: '21 oct 2026',
		tone: 'banana',
		emoji: '🍌',
		quantity: 10,
		action: 'idle',
	},
];

function App() {
	const [products, setProducts] = useState(initialProducts);
	const [alert, setAlert] = useState(null);
	const [isModalOpen, setIsModalOpen] = useState(true);

	useEffect(() => {
		if (!alert) return undefined;

		const timer = window.setTimeout(() => {
			setAlert(null);
		}, 2600);

		return () => window.clearTimeout(timer);
	}, [alert]);

	const handleQuantityChange = (id, delta) => {
		setProducts((current) =>
			current.map((product) =>
				product.id === id
					? { ...product, quantity: Math.max(0, (product.quantity ?? 0) + delta), action: 'editing' }
					: product
			)
		);
	};

	const handleEdit = (id) => {
		setProducts((current) =>
			current.map((product) =>
				product.id === id ? { ...product, action: 'editing' } : { ...product, action: 'idle' }
			)
		);
	};

	const handleAccept = (id) => {
		setProducts((current) =>
			current.map((product) => (product.id === id ? { ...product, action: 'accepted' } : product))
		);
	};

	const handleReject = (id) => {
		setProducts((current) =>
			current.map((product) => (product.id === id ? { ...product, action: 'rejected' } : product))
		);
	};

	const handleConfirm = (updatedProducts) => {
		const total = updatedProducts.reduce((acc, product) => acc + (product.quantity ?? 0), 0);

		setProducts(updatedProducts);
		setIsModalOpen(false);
		setAlert({
			type: 'success',
			message: `Reposición actualizada correctamente. Total confirmado: ${total} unidades.`,
		});
	};

	const closeModal = () => {
		setIsModalOpen(false);
	};

	return (
		<>
			{alert ? <SuccessToast message={alert.message} /> : null}

			{isModalOpen ? (
				<RestockPopup
					products={products}
					onQuantityChange={handleQuantityChange}
					onEdit={handleEdit}
					onAccept={handleAccept}
					onReject={handleReject}
					onConfirm={handleConfirm}
					onClose={closeModal}
					onCancel={closeModal}
				/>
			) : null}
		</>
	);
}

export default App;
