import { useState, useEffect } from 'react';
import { 
  uploadCSVDatasetToFirestore, 
  fetchAllMoviesFromFirestore, 
  fetchMovieByIdServerless 
} from './services/movieServerlessService'; // Ajusta la ruta según tu estructura

export default function MovieDashboard() {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [searchId, setSearchId] = useState('');

  // Cargar películas al iniciar
  useEffect(() => {
    loadMovies();
  }, []);

  const loadMovies = async () => {
    setLoading(true);
    try {
      const data = await fetchAllMoviesFromFirestore();
      setMovies(data);
    } catch (error) {
      console.error("Error cargando películas:", error);
    }
    setLoading(false);
  };

  const handleFileChange = (e) => {
    setCsvFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!csvFile) return alert('Por favor selecciona un archivo CSV');
    
    try {
      setUploadProgress({ percent: 0 });
      await uploadCSVDatasetToFirestore(csvFile, (progress) => {
        setUploadProgress(progress);
      });
      alert('Carga masiva completada con éxito');
      setCsvFile(null);
      setUploadProgress(null);
      loadMovies(); // Recargar la lista
    } catch (error) {
      console.error("Error en la carga masiva:", error);
      alert('Hubo un error en la carga del CSV');
    }
  };

  const handleSearch = async () => {
    if (!searchId.trim()) {
      loadMovies();
      return;
    }
    setLoading(true);
    try {
      const result = await fetchMovieByIdServerless(searchId);
      setMovies(result);
    } catch (error) {
      console.error("Error buscando película:", error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabecera y Controles */}
        <div className="bg-white p-6 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Serverless Movie DB</h1>
          
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              accept=".csv" 
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
            <button 
              onClick={handleUpload}
              disabled={!csvFile || uploadProgress}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {uploadProgress ? 'Cargando...' : 'Subir CSV'}
            </button>
          </div>
        </div>

        {/* Barra de Progreso */}
        {uploadProgress && (
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between text-sm mb-1 text-gray-700">
              <span>Progreso de carga: {uploadProgress.uploaded} / {uploadProgress.total}</span>
              <span>{uploadProgress.percent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress.percent}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Buscador */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Buscar por ID (ej. MOV-0001)..." 
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={handleSearch}
              className="bg-gray-800 text-white px-6 py-2 rounded-md hover:bg-gray-900 transition"
            >
              Buscar
            </button>
          </div>
        </div>

        {/* Lista de Películas */}
        {loading ? (
          <p className="text-center text-gray-500 py-10">Cargando datos serverless...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {movies.map((movie) => (
              <div key={movie.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition">
                <div className="flex justify-between items-start mb-2">
                  <h2 className="text-xl font-bold text-gray-800 truncate">{movie.title}</h2>
                  <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
                    {movie.id}
                  </span>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-3">{movie.synopsis}</p>
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Año: {movie.release_year}</span>
                  <span>Rating: {movie.rating_out_of_10}/10</span>
                </div>
              </div>
            ))}
            {movies.length === 0 && !loading && (
              <p className="text-gray-500 col-span-full text-center">No hay películas en la base de datos.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}