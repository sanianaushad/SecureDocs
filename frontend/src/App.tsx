import { useEffect, useMemo, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useNavigate
} from "react-router-dom";
import "./App.css";

const API_URL = "https://securedocs-g0rg.onrender.com";

type Folder = {
  id: number;
  name: string;
  created_at: string;
};

type DocumentItem = {
  id: number;
  filename: string;
  mime_type: string | null;
  size_bytes: number | null;
  folder_id: number | null;
  created_at: string;
};

type Share = {
  id: number;
  document_id: number;
  filename: string;
  expires_at: string;
  revoked: boolean;
  active: boolean;
  share_url: string;
};

type User = {
  id: number;
  email: string;
};

function getToken() {
  return localStorage.getItem("access_token");
}

async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = getToken();

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });
}

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Login failed");
        return;
      }

      localStorage.setItem("access_token", data.access_token);
      setMessage("Login successful!");

      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-icon">S</div>
          <h1>SecureDocs</h1>
        </div>

        <p className="subtitle">Secure document management</p>

        <div className="form-container">
          <h2>Welcome back</h2>

          <p className="form-description">
            Sign in to access your secure documents.
          </p>

          <form onSubmit={handleLogin}>
            <label htmlFor="login-email">Email</label>

            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />

            <label htmlFor="login-password">Password</label>

            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              required
            />

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Login"}
            </button>
          </form>

          {message && (
            <p className="success-message">{message}</p>
          )}

          {error && (
            <p className="error-message">{error}</p>
          )}

          <p className="switch-page">
            Don't have an account? <Link to="/signup">Sign up</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSignup(event: React.FormEvent) {
    event.preventDefault();

    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Signup failed");
        return;
      }

      setMessage("Account created successfully!");

      setEmail("");
      setPassword("");

      setTimeout(() => {
        navigate("/login");
      }, 800);
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <div className="brand-icon">S</div>
          <h1>SecureDocs</h1>
        </div>

        <p className="subtitle">Secure document management</p>

        <div className="form-container">
          <h2>Create your account</h2>

          <p className="form-description">
            Get started with your secure document workspace.
          </p>

          <form onSubmit={handleSignup}>
            <label htmlFor="signup-email">Email</label>

            <input
              id="signup-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email"
              required
            />

            <label htmlFor="signup-password">Password</label>

            <input
              id="signup-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Create a password"
              minLength={6}
              required
            />

            <button
              className="primary-button"
              type="submit"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          {message && (
            <p className="success-message">{message}</p>
          )}

          {error && (
            <p className="error-message">{error}</p>
          )}

          <p className="switch-page">
            Already have an account? <Link to="/login">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function DashboardPage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);

  const [folderName, setFolderName] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [sharePanelDocument, setSharePanelDocument] = useState<
    number | null
  >(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [shareHours, setShareHours] = useState(24);
  const [creatingShare, setCreatingShare] = useState(false);
  const [copiedShareId, setCopiedShareId] = useState<number | null>(null);

  function handleUnauthorized() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const [userResponse, folderResponse, documentResponse] =
        await Promise.all([
          apiRequest("/api/me"),
          apiRequest("/api/folders"),
          apiRequest("/api/documents")
        ]);

      if (
        userResponse.status === 401 ||
        folderResponse.status === 401 ||
        documentResponse.status === 401
      ) {
        handleUnauthorized();
        return;
      }

      if (
        !userResponse.ok ||
        !folderResponse.ok ||
        !documentResponse.ok
      ) {
        throw new Error("Failed to load dashboard");
      }

      const userData = await userResponse.json();
      const folderData = await folderResponse.json();
      const documentData = await documentResponse.json();

      setUser(userData);
      setFolders(folderData);
      setDocuments(documentData);
    } catch {
      setError("Could not load your document workspace.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    loadDashboard();
  }, []);

  async function handleCreateFolder(
    event: React.FormEvent
  ) {
    event.preventDefault();

    const trimmedName = folderName.trim();

    if (!trimmedName) {
      return;
    }

    setCreatingFolder(true);
    setMessage("");
    setError("");

    try {
      const response = await apiRequest("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: trimmedName
        })
      });

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.detail || "Could not create folder");
        return;
      }

      setFolderName("");
      setMessage("Folder created successfully.");
      await loadDashboard();
    } catch {
      setError("Could not connect to the backend.");
    } finally {
      setCreatingFolder(false);
    }
  }

  async function uploadFile(file: File) {
    if (!file) {
      return;
    }

    setUploading(true);
    setMessage("");
    setError("");

    const formData = new FormData();

    formData.append("file", file);

    if (selectedFolder) {
      formData.append("folder_id", selectedFolder);
    }

    try {
      const response = await apiRequest(
        "/api/documents/upload",
        {
          method: "POST",
          body: formData
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.detail || "Upload failed");
        return;
      }

      setMessage("Document uploaded successfully.");
      await loadDashboard();
    } catch {
      setError("Could not upload the document.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);
    event.target.value = "";
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!uploading) {
      setIsDragging(true);
    }
  }

  function handleDragEnter(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();

    if (!uploading) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    if (uploading) {
      return;
    }

    const file = event.dataTransfer.files?.[0];

    if (!file) {
      return;
    }

    await uploadFile(file);
  }

  async function handleDeleteFolder(folderId: number) {
    const confirmed = window.confirm(
      "Delete this folder? Documents inside it will remain in your workspace."
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await apiRequest(
        `/api/folders/${folderId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.detail || "Could not delete folder");
        return;
      }

      if (selectedFolder === String(folderId)) {
        setSelectedFolder("");
      }

      setMessage("Folder deleted successfully.");
      await loadDashboard();
    } catch {
      setError("Could not delete the folder.");
    }
  }

  async function handleDeleteDocument(documentId: number) {
    const confirmed = window.confirm(
      "Delete this document permanently?"
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await apiRequest(
        `/api/documents/${documentId}`,
        {
          method: "DELETE"
        }
      );

      const data = await response.json();

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        setError(data.detail || "Could not delete document");
        return;
      }

      if (sharePanelDocument === documentId) {
        setSharePanelDocument(null);
        setShares([]);
      }

      setMessage("Document deleted successfully.");
      await loadDashboard();
    } catch {
      setError("Could not delete the document.");
    }
  }

  async function handleDownload(documentId: number) {
    setMessage("");
    setError("");

    try {
      const response = await apiRequest(
        `/api/documents/${documentId}/download`
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      if (!response.ok) {
        const data = await response.json();
        setError(data.detail || "Could not download document");
        return;
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      const documentItem = documents.find(
        (item) => item.id === documentId
      );

      link.href = url;
      link.download = documentItem?.filename || "document";
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch {
      setError("Could not download the document.");
    }
  }

  async function handleOpenSharePanel(documentId: number) {
    setMessage("");
    setError("");

    if (sharePanelDocument === documentId) {
      setSharePanelDocument(null);
      setShares([]);
      return;
    }

    try {
      const response = await apiRequest(
        `/api/documents/${documentId}/shares`
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not load share links");
        return;
      }

      setShares(data);
      setSharePanelDocument(documentId);
    } catch {
      setError("Could not load share links.");
    }
  }

  async function handleCreateShare(documentId: number) {
    setCreatingShare(true);
    setMessage("");
    setError("");

    try {
      const response = await apiRequest(
        `/api/documents/${documentId}/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            expires_in_hours: shareHours
          })
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not create share link");
        return;
      }

      const fullShareUrl = `${API_URL}${data.share_url}`;

      try {
        await navigator.clipboard.writeText(fullShareUrl);
        setMessage(
          "Share link created and copied to clipboard."
        );
      } catch {
        setMessage("Share link created successfully.");
      }

      const sharesResponse = await apiRequest(
        `/api/documents/${documentId}/shares`
      );

      if (sharesResponse.ok) {
        const sharesData = await sharesResponse.json();
        setShares(sharesData);
      }

      setSharePanelDocument(documentId);
    } catch {
      setError("Could not create the share link.");
    } finally {
      setCreatingShare(false);
    }
  }

  async function handleRevokeShare(
    shareId: number,
    documentId: number
  ) {
    const confirmed = window.confirm(
      "Revoke this share link? Anyone using it will lose access."
    );

    if (!confirmed) {
      return;
    }

    setMessage("");
    setError("");

    try {
      const response = await apiRequest(
        `/api/shares/${shareId}`,
        {
          method: "DELETE"
        }
      );

      if (response.status === 401) {
        handleUnauthorized();
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        setError(data.detail || "Could not revoke share link");
        return;
      }

      setMessage("Share link revoked successfully.");

      const sharesResponse = await apiRequest(
        `/api/documents/${documentId}/shares`
      );

      if (sharesResponse.ok) {
        const sharesData = await sharesResponse.json();
        setShares(sharesData);
      }
    } catch {
      setError("Could not revoke the share link.");
    }
  }

  async function handleCopyShareLink(share: Share) {
    const fullShareUrl = `${API_URL}${share.share_url}`;

    try {
      await navigator.clipboard.writeText(fullShareUrl);

      setCopiedShareId(share.id);
      setMessage("Share link copied to clipboard.");
      setError("");

      setTimeout(() => {
        setCopiedShareId((currentId) =>
          currentId === share.id ? null : currentId
        );
      }, 2000);
    } catch {
      setError("Could not copy the share link.");
      setMessage("");
    }
  }

  function handleLogout() {
    localStorage.removeItem("access_token");
    navigate("/login");
  }

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return documents.filter((document) => {
      const matchesFolder =
        !selectedFolder ||
        document.folder_id === Number(selectedFolder);

      const matchesSearch =
        !normalizedSearch ||
        document.filename
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesFolder && matchesSearch;
    });
  }, [documents, selectedFolder, search]);

  function getFolderName(folderId: number | null) {
    if (!folderId) {
      return "No folder";
    }

    return (
      folders.find((folder) => folder.id === folderId)?.name ||
      "No folder"
    );
  }

  function formatFileSize(size: number | null) {
    if (!size) {
      return "0 KB";
    }

    if (size < 1024) {
      return `${size} B`;
    }

    if (size < 1024 * 1024) {
      return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatShareExpiry(date: string) {
    return new Date(date).toLocaleString();
  }

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-spinner"></div>
        <p>Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <nav className="navbar">
        <div className="nav-brand">
          <div className="brand-icon small">S</div>
          <span>SecureDocs</span>
        </div>

        <div className="nav-right">
          <span className="user-email">
            {user?.email}
          </span>

          <button
            className="logout-button"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </nav>

      <main className="workspace">
        <div className="workspace-header">
          <div>
            <p className="eyebrow">SECURE WORKSPACE</p>
            <h1>Your Documents</h1>
            <p>
              Store, organize and manage your documents securely.
            </p>
          </div>

          <label className="upload-button">
            {uploading ? "Uploading..." : "Upload document"}
            <input
              type="file"
              onChange={handleUpload}
              disabled={uploading}
              hidden
            />
          </label>
        </div>

        <div
          className={`drag-upload-zone ${
            isDragging ? "is-dragging" : ""
          } ${uploading ? "is-uploading" : ""}`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="drag-upload-icon">
            {uploading ? "⏳" : "📁"}
          </div>

          <div>
            <strong>
              {uploading
                ? "Uploading document..."
                : isDragging
                ? "Drop your file here"
                : "Drag & drop a file here"}
            </strong>

            {!uploading && (
              <p>
                or use the <span>Upload document</span> button above
              </p>
            )}
          </div>
        </div>

        {message && (
          <div className="alert success-alert">
            {message}
          </div>
        )}

        {error && (
          <div className="alert error-alert">
            {error}
          </div>
        )}

        <section className="workspace-grid">
          <aside className="sidebar-card">
            <div className="section-heading">
              <div>
                <h2>Folders</h2>
                <span>{folders.length} folders</span>
              </div>
            </div>

            <form
              className="folder-form"
              onSubmit={handleCreateFolder}
            >
              <input
                value={folderName}
                onChange={(event) =>
                  setFolderName(event.target.value)
                }
                placeholder="New folder name"
              />

              <button
                type="submit"
                disabled={creatingFolder}
              >
                +
              </button>
            </form>

            <button
              className={`folder-item ${
                selectedFolder === "" ? "active" : ""
              }`}
              onClick={() => setSelectedFolder("")}
            >
              <span>📂</span>
              <span>All documents</span>
              <strong>{documents.length}</strong>
            </button>

            {folders.map((folder) => (
              <div
                className={`folder-row ${
                  selectedFolder === String(folder.id)
                    ? "active"
                    : ""
                }`}
                key={folder.id}
              >
                <button
                  className="folder-item"
                  onClick={() =>
                    setSelectedFolder(String(folder.id))
                  }
                >
                  <span>📁</span>
                  <span>{folder.name}</span>
                  <strong>
                    {
                      documents.filter(
                        (document) =>
                          document.folder_id === folder.id
                      ).length
                    }
                  </strong>
                </button>

                <button
                  className="delete-folder-button"
                  onClick={() =>
                    handleDeleteFolder(folder.id)
                  }
                  title="Delete folder"
                >
                  ×
                </button>
              </div>
            ))}
          </aside>

          <section className="documents-card">
            <div className="documents-header">
              <div>
                <h2>Documents</h2>
                <span>
                  {filteredDocuments.length} document
                  {filteredDocuments.length === 1 ? "" : "s"}
                </span>
              </div>

              <input
                className="search-input"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search documents..."
              />
            </div>

            {filteredDocuments.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>

                <h3>
                  {documents.length === 0
                    ? "No documents yet"
                    : "No matching documents"}
                </h3>

                <p>
                  {documents.length === 0
                    ? "Upload your first document to get started."
                    : "Try a different search or folder."}
                </p>
              </div>
            ) : (
              <div className="document-list">
                {filteredDocuments.map((document) => (
                  <div
                    className="document-row"
                    key={document.id}
                  >
                    <div className="document-icon">
                      📄
                    </div>

                    <div className="document-info">
                      <h3>{document.filename}</h3>

                      <p>
                        {getFolderName(document.folder_id)}
                        {" · "}
                        {formatFileSize(document.size_bytes)}
                      </p>
                    </div>

                    <div className="document-actions">
                      <button
                        onClick={() =>
                          handleDownload(document.id)
                        }
                      >
                        Download
                      </button>

                      <button
                        onClick={() =>
                          handleOpenSharePanel(document.id)
                        }
                      >
                        Share
                      </button>

                      <button
                        className="danger-button"
                        onClick={() =>
                          handleDeleteDocument(document.id)
                        }
                      >
                        Delete
                      </button>
                    </div>

                    {sharePanelDocument === document.id && (
                      <div className="share-panel">
                        <div className="share-panel-header">
                          <div>
                            <h3>Share document</h3>
                            <p>
                              Create a secure link with an
                              expiration time.
                            </p>
                          </div>

                          <button
                            className="share-close-button"
                            onClick={() => {
                              setSharePanelDocument(null);
                              setShares([]);
                            }}
                          >
                            ×
                          </button>
                        </div>

                        <div className="share-create-row">
                          <label
                            htmlFor={`share-expiry-${document.id}`}
                          >
                            Expires in
                          </label>

                          <select
                            id={`share-expiry-${document.id}`}
                            value={shareHours}
                            onChange={(event) =>
                              setShareHours(
                                Number(event.target.value)
                              )
                            }
                          >
                            <option value={1}>
                              1 hour
                            </option>
                            <option value={6}>
                              6 hours
                            </option>
                            <option value={24}>
                              24 hours
                            </option>
                            <option value={48}>
                              48 hours
                            </option>
                            <option value={72}>
                              72 hours
                            </option>
                            <option value={168}>
                              7 days
                            </option>
                          </select>

                          <button
                            onClick={() =>
                              handleCreateShare(document.id)
                            }
                            disabled={creatingShare}
                          >
                            {creatingShare
                              ? "Creating..."
                              : "Generate Link"}
                          </button>
                        </div>

                        {shares.length === 0 ? (
                          <p className="no-shares">
                            No share links created yet.
                          </p>
                        ) : (
                          <div className="share-list">
                            {shares.map((share) => (
                              <div
                                className="share-item"
                                key={share.id}
                              >
                                <div className="share-item-info">
                                  <strong>
                                    {share.active
                                      ? "Active link"
                                      : share.revoked
                                      ? "Revoked"
                                      : "Expired"}
                                  </strong>

                                  <span>
                                    Expires:{" "}
                                    {formatShareExpiry(
                                      share.expires_at
                                    )}
                                  </span>

                                  <code>
                                    {API_URL}
                                    {share.share_url}
                                  </code>
                                </div>

                                {share.active && (
                                  <div className="share-item-actions">
                                    <button
                                      onClick={() =>
                                        handleCopyShareLink(
                                          share
                                        )
                                      }
                                    >
                                      {copiedShareId === share.id
                                        ? "✓ Link copied!"
                                        : "Copy Link"}
                                    </button>

                                    <button
                                      className="danger-button"
                                      onClick={() =>
                                        handleRevokeShare(
                                          share.id,
                                          document.id
                                        )
                                      }
                                    >
                                      Revoke
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </section>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;