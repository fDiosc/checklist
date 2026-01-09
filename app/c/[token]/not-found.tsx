export default function NotFound() {
    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
                <h2 className="text-2xl font-semibold text-gray-700 mb-2">
                    Checklist não encontrado
                </h2>
                <p className="text-gray-600">
                    O link que você está tentando acess ar não existe ou expirou.
                </p>
            </div>
        </div>
    );
}
