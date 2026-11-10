/**
 * Módulo Serverless de Base de Datos e Integración (Firestore + ETL CSV)
 * Archivo: src/services/movieServerlessService.js
 * Actividad Sumativa - Unidad 4: Creación de aplicación usando el patrón serverless
 */

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
   getDoc,
  getDocs,
  writeBatch,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import Papa from 'papaparse';

// ============================================================================
// 1. CONFIGURACIÓN DEL PROYECTO SERVERLESS EN FIREBASE
// ============================================================================
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_PROYECTO.firebaseapp.com",
  projectId: "TU_PROYECTO_ID",
  storageBucket: "TU_PROYECTO.firebasestorage.app",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const COLLECTION_NAME = 'movies';

// ============================================================================
// 2. FUNCIONES DE CONVERSIÓN PARA MANTENER ESTRUCTURA Y TIPOS DE DATOS
// ============================================================================
const toNumber = (value, isFloat = false) => {
  if (value === undefined || value === null || String(value).trim() === '') return 0;
  const cleaned = String(value).replace(/[^0-9.-]+/g, '');
  const parsed = isFloat ? parseFloat(cleaned) : parseInt(cleaned, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const toText = (value) => (value ? String(value).trim() : '');

// ============================================================================
// 3. SCRIPT SERVERLESS DE CARGA MASIVA DEL DATASET CSV A FIRESTORE
// Lee el archivo recent_movies_2024_2026.csv y sube el 100% en lotes (WriteBatch)
// ============================================================================
export const uploadCSVDatasetToFirestore = (csvFile, onProgress) => {
  return new Promise((resolve, reject) => {
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          if (!rows || rows.length === 0) {
            throw new Error('El archivo CSV está vacío o no tiene el formato esperado.');
          }

          // Transformar cada fila conservando sus tipos de datos (Number y String)
          const formattedMovies = rows.map((row, index) => {
            const movieId = `MOV-${String(index + 1).padStart(4, '0')}`;
            const titleClean = toText(row.title || row.Title);

            return {
              id: movieId, // ID Principal único para búsqueda exacta
              title: titleClean, // Columna secundaria única (no repetitiva)
              title_lowercase: titleClean.toLowerCase(),
              release_year: toNumber(row.release_year, false),
              release_month: toText(row.release_month),
              release_day: toNumber(row.release_day, false),
              genres: toText(row.genres),
              rating_out_of_10: toNumber(row.rating_out_of_10, true),
              vote_count: toNumber(row.vote_count, false),
              runtime_minutes: toNumber(row.runtime_minutes, false),
              box_office_usd: toNumber(row.box_office_usd, true),
              budget_usd: toNumber(row.budget_usd, true),
              director: toText(row.director) || 'Director no especificado',
              screenwriter: toText(row.screenwriter),
              cast: toText(row.cast),
              production_company: toText(row.production_company),
              content_rating: toText(row.content_rating) || 'PG-13',
              language: toText(row.language) || 'English',
              country: toText(row.country) || 'United States',
              synopsis: toText(row.synopsis),
              wikipedia_url: toText(row.wikipedia_url),
              poster_url: toText(row.poster_url),
              uploaded_at: serverTimestamp(),
            };
          });

          // Subir en lotes de 400 documentos (Firestore permite hasta 500 por WriteBatch)
          const BATCH_SIZE = 400;
          let uploadedCount = 0;

          for (let i = 0; i < formattedMovies.length; i += BATCH_SIZE) {
            const chunk = formattedMovies.slice(i, i + BATCH_SIZE);
            const batch = writeBatch(db);

            chunk.forEach((movie) => {
              const docRef = doc(db, COLLECTION_NAME, movie.id);
              batch.set(docRef, movie);
            });

            await batch.commit();
            uploadedCount += chunk.length;

            if (onProgress) {
              const percent = Math.round((uploadedCount / formattedMovies.length) * 100);
              onProgress({ uploaded: uploadedCount, total: formattedMovies.length, percent });
            }
          }

          resolve({
            totalUploaded: uploadedCount,
            sample: formattedMovies.slice(0, 5),
          });
        } catch (err) {
          reject(err);
        }
      },
      error: (err) => reject(err),
    });
  });
};

// ============================================================================
// 4. FUNCIONES SERVERLESS DE CONSULTA Y BÚSQUEDA (ID PRINCIPAL Y TÍTULO)
// ============================================================================

/**
 * Obtiene todos los registros almacenados en la colección serverless de Firestore
 */
export const fetchAllMoviesFromFirestore = async () => {
  const moviesRef = collection(db, COLLECTION_NAME);
  const q = query(moviesRef, orderBy('id', 'asc'), limit(1000));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => docSnap.data());
};

/**
 * Busca una película directamente en Firestore por su ID Principal (ej. MOV-0049)
 */
export const fetchMovieByIdServerless = async (movieId) => {
  const normalizedId = String(movieId).trim().toUpperCase();
  const docRef = doc(db, COLLECTION_NAME, normalizedId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return [docSnap.data()];
  }
  return [];
};