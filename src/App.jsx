import React, { useState, useEffect, useRef, useMemo } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
} from "firebase/auth";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { setLogLevel } from "firebase/firestore";

// Import snippets data from separate file
import { SNIPPET_DATA } from "./snippets-data.js";

console.log("🔧 App component loading...");

// --- ENVIRONMENT VARIABLE HELPER ----
const safeGetEnv = (key, defaultValue) => {
  // For Vite - use VITE_ prefix
  if (import.meta.env && import.meta.env[`VITE_${key}`]) {
    return import.meta.env[`VITE_${key}`];
  }
  // Canvas runtime fallback
  if (typeof window !== "undefined" && window[`__${key.toLowerCase()}`]) {
    return window[`__${key.toLowerCase()}`];
  }
  return defaultValue;
};

// --- GLOBAL CONFIGURATION ---
const ACCESS_NAME = safeGetEnv("ACCESS_NAME", "Rose");

// --- FIREBASE INITIALIZATION HOOK ---
const useFirebase = () => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);

  const firebaseConfig = useMemo(
    () => ({
      apiKey: safeGetEnv("FIREBASE_API_KEY", ""),
      authDomain: safeGetEnv("FIREBASE_AUTH_DOMAIN", ""),
      projectId: safeGetEnv("FIREBASE_PROJECT_ID", ""),
      storageBucket: safeGetEnv("FIREBASE_STORAGE_BUCKET", ""),
      messagingSenderId: safeGetEnv("FIREBASE_MESSAGING_SENDER_ID", ""),
      appId: safeGetEnv("FIREBASE_APP_ID", ""),
    }),
    []
  );

  useEffect(() => {
    let app;
    try {
      if (!firebaseConfig.projectId) {
        console.warn(
          "Firebase configuration is missing Project ID. Persistence features are disabled."
        );
        return;
      }

      app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setLogLevel("debug"); // Enable Firestore logging

      const handleAuth = async () => {
        const initialAuthToken = safeGetEnv("INITIAL_AUTH_TOKEN", null);

        try {
          if (initialAuthToken) {
            await signInWithCustomToken(firebaseAuth, initialAuthToken);
          } else {
            await signInAnonymously(firebaseAuth);
          }
        } catch (error) {
          console.error("Firebase Auth failed:", error);
        }
      };

      handleAuth();

      const unsubscribeAuth = firebaseAuth.onAuthStateChanged((user) => {
        if (user) {
          setUserId(user.uid);
          setDb(firestore);
          setAuth(firebaseAuth);
          console.log("Firebase initialized and user signed in:", user.uid);
        } else {
          setUserId(crypto.randomUUID());
          setDb(firestore);
          setAuth(firebaseAuth);
        }
      });

      return () => unsubscribeAuth();
    } catch (e) {
      console.error(
        "CRITICAL: Failed to initialize Firebase (config error). Persistence is disabled.",
        e
      );
    }
  }, [firebaseConfig]);

  return { db, auth, userId, isInitialized: !!db };
};

// Function to format note for editing (convert URLs to clickable links)
const formatNoteForEditing = (text) => {
  if (!text) return "";

  // Convert URLs to clickable links while editing
  const urlPattern = /(https?:\/\/[^\s<]+)/g;
  return text.replace(
    urlPattern,
    (url) =>
      `<a href="${url}" target="_blank" rel="noopener noreferrer" 
       data-original-url="${url}" 
       class="text-blue-600 hover:text-blue-800 underline cursor-pointer"
       onclick="event.preventDefault(); window.open('${url}', '_blank');">
      ${url}
    </a>`
  );
};

// Function to format note for display (view mode)
const formatNoteForDisplay = (text) => {
  if (!text) return text;

  const urlPattern = /(https?:\/\/[^\s]+)/g;
  return text.split("\n").map((line, index) => {
    const parts = line.split(urlPattern);
    return (
      <div key={index}>
        {parts.map((part, partIndex) =>
          urlPattern.test(part) ? (
            <a
              key={partIndex}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline break-all"
            >
              {part}
            </a>
          ) : (
            part
          )
        )}
      </div>
    );
  });
};

// --- NOTE SNIPPET COMPONENT ---
const NoteSnippet = ({
  id,
  title,
  images,
  userId,
  isEditable,
  db,
  defaultNote,
}) => {
  const [note, setNote] = useState(defaultNote);
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef(null);

  const getThumbWidthClass = () => {
    const count = images.length;
    if (count === 1) return "w-full";
    if (count === 2) return "w-1/2";
    return "w-1/3";
  };

  const getNoteRef = () => {
    if (!db) return null;
    const appId = safeGetEnv("APP_ID", "default-app-id");
    return doc(db, `artifacts/${appId}/public/data/shared_note`, id);
  };

  useEffect(() => {
    const noteRef = getNoteRef();

    if (noteRef && userId) {
      const unsubscribe = onSnapshot(
        noteRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setNote(data.content || defaultNote);
          } else {
            setNote(defaultNote);
          }
        },
        (error) => {
          console.warn(`Note ID ${id}: Listener error (may be safe):`, error);
        }
      );
      return () => unsubscribe();
    }
  }, [db, userId, id, defaultNote]);

  const handleSave = async () => {
    if (!db || !userId || !isEditable) return;
    setIsSaving(true);
    try {
      const noteRef = getNoteRef();
      await setDoc(noteRef, {
        content: note,
        updatedAt: new Date().toISOString(),
        userId: userId,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving document:", error);
      console.error("Error saving note. Check console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      textareaRef.current.focus();
    }
  }, [isEditing, note]);

  // Function to format note for display (view mode) with clickable links
  const formatNoteWithLinks = (text) => {
    if (!text) return text;

    const urlPattern = /(https?:\/\/[^\s]+)/g;
    return text.split("\n").map((line, index) => {
      const parts = line.split(urlPattern);
      return (
        <div key={index} className="mb-1">
          {parts.map((part, partIndex) =>
            urlPattern.test(part) ? (
              <a
                key={partIndex}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline break-all"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
            ) : (
              part
            )
          )}
        </div>
      );
    });
  };

  const ImageModal = () => (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={() => setShowModal(null)}
    >
      <div
        className="max-w-4xl max-h-full overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="absolute top-4 right-4 text-white text-3xl font-bold p-2"
          onClick={() => setShowModal(null)}
        >
          &times;
        </button>
        <img
          src={showModal}
          alt="Full-size selection"
          className="rounded-lg shadow-2xl max-w-full max-h-[90vh]"
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              "https://placehold.co/800x600/6B7280/ffffff?text=Image+Load+Error";
          }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-3 p-4 bg-white rounded-xl shadow-lg border border-gray-100">
      {showModal && <ImageModal />}

      <h3 className="text-lg font-semibold text-gray-800 border-b pb-1 mb-2">
        {title}
      </h3>

      <div
        className={`flex w-full overflow-hidden rounded-lg shadow-md border border-gray-200`}
      >
        {images.map((img, index) => (
          <div
            key={index}
            className={`group cursor-pointer aspect-square ${getThumbWidthClass()} transition duration-300 ease-in-out hover:opacity-80`}
            onClick={() => setShowModal(img)}
          >
            <img
              src={img}
              alt={`Thumbnail ${index + 1}`}
              className="w-full h-full object-cover transition duration-200 group-hover:scale-[1.03]"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src =
                  "https://placehold.co/400x300/6B7280/ffffff?text=Image+Load+Error";
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex w-full space-x-2 items-start">
        {isEditing ? (
          // Editing mode - use textarea (normal typing)
          <textarea
            ref={textareaRef}
            className="flex-grow resize-none p-2 text-sm rounded-lg border border-blue-300 bg-white focus:ring-blue-500 focus:border-blue-500 shadow-sm transition duration-150"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Enter your observations and notes... URLs will become clickable when saved."
            rows={3}
            disabled={isSaving}
          />
        ) : (
          // View mode - show formatted text with clickable links
          <div
            className={`flex-grow p-2 text-sm rounded-lg border min-h-[80px] w-full cursor-pointer ${
              isEditable
                ? "bg-gray-50 border-gray-200 hover:bg-gray-100"
                : "bg-gray-50 border-gray-200"
            }`}
            onClick={() => isEditable && setIsEditing(true)}
          >
            {note ? (
              formatNoteWithLinks(note)
            ) : (
              <span className="text-gray-400">
                {isEditable ? "Click to add notes..." : "No notes yet..."}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col space-y-2">
          {isEditing && (
            <button
              onClick={() => {
                setIsEditing(false);
                setNote(note); // Reset any unsaved changes
              }}
              className="w-14 h-7 flex justify-center items-center rounded text-white bg-gray-500 hover:bg-gray-600 text-xs font-semibold"
            >
              Cancel
            </button>
          )}
          <button
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            disabled={(!isEditable || isSaving) && !isEditing}
            className={`w-14 h-14 flex flex-col justify-center items-center rounded-lg text-white font-semibold shadow-md transition duration-200 leading-tight text-center text-[0.7rem] ${
              (isEditable && !isSaving) || isEditing
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
                : "bg-gray-400 cursor-not-allowed"
            }`}
          >
            {isSaving ? (
              <svg
                className="animate-spin h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
            ) : isEditing ? (
              <>
                Save
                <br />
                Note
              </>
            ) : (
              <>
                Edit
                <br />
                Note
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION COMPONENT ---
export default function App() {
  const { db, auth, userId } = useFirebase();

  // ADD THIS DEBUG LOGGING
  console.log("🔧 App rendering...");
  console.log("Firebase db:", db);
  console.log("User ID:", userId);
  console.log("Snippets data:", SNIPPET_DATA);

  const [accessInput, setAccessInput] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  // Simple image URL constructor using actual filenames
  const getImagePaths = (snippetId, imageFilenames) => {
    return imageFilenames.map((filename) => `images/${snippetId}/${filename}`);
  };

  // Generate snippets with your actual plant images
  const snippets = useMemo(
    () =>
      SNIPPET_DATA.map((data) => ({
        ...data,
        images: getImagePaths(data.id, data.imageFilenames),
      })),
    []
  );

  const checkAccess = (input) => {
    return input.toLowerCase() === ACCESS_NAME.toLowerCase();
  };

  const handleUnlock = () => {
    if (checkAccess(accessInput)) {
      setIsUnlocked(true);
      setAccessInput("");
    } else {
      console.error("Incorrect access name. Please try again.");
      setAccessInput("");
    }
  };

  console.log("🔧 About to render JSX...");
  console.log("Snippets:", snippets);
  console.log("isUnlocked:", isUnlocked);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6 font-inter">
      <header className="max-w-4xl mx-auto mb-6 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 border-b-2 border-blue-500 pb-2">
          Plant Observation Tracker
        </h1>
        <p className="text-gray-500 mt-2">
          Track your plant growth and observations. Access Name: **
          {ACCESS_NAME}
          **
        </p>
        <p className="text-sm text-red-500 mt-1">
          {db && isUnlocked ? (
            <span>
              Persistent connection, <strong>{ACCESS_NAME}</strong> — you can
              save your notes now.
            </span>
          ) : (
            <span>Persistence NOT Active (Missing Firebase Config).</span>
          )}
        </p>
      </header>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* --- GLOBAL UNLOCK BAR --- */}
        {!isUnlocked && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-md flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-4">
            <label
              htmlFor="access-name"
              className="text-sm font-medium text-yellow-800 shrink-0"
            >
              Enter Access Name to Edit:
            </label>
            <input
              id="access-name"
              type="text"
              className="w-full sm:w-64 p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm"
              value={accessInput}
              onChange={(e) => setAccessInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") handleUnlock();
              }}
              placeholder="Enter Name..."
            />
            <button
              onClick={handleUnlock}
              className="w-full sm:w-auto px-4 py-2 bg-yellow-600 text-white font-semibold rounded-md shadow-sm hover:bg-yellow-700 transition duration-150 text-sm"
            >
              Unlock Editing
            </button>
          </div>
        )}

        {/* --- RENDER PLANT SNIPPETS --- */}
        {snippets.map((data, index) => (
          <React.Fragment key={data.id}>
            <NoteSnippet
              id={data.id}
              title={data.title}
              images={data.images}
              defaultNote={data.defaultNote}
              userId={userId}
              db={db}
              isEditable={isUnlocked && !!db}
            />
            {index < snippets.length - 1 && (
              <hr className="border-t-2 border-gray-200 my-6" />
            )}
          </React.Fragment>
        ))}
      </div>

      <footer className="max-w-4xl mx-auto mt-8 text-center text-xs text-gray-500">
        <p>Plant observation tracker powered by React and Google Firestore.</p>
      </footer>
    </div>
  );
}
