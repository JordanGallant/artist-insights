"use client";
import React, { useEffect, useState, useMemo } from "react";
import { graphqlClient } from "../lib/graphql";
import Loader from "./Loader";

// Interface for Artist data
interface Artist {
  id: string;
  artistName: string;
  slug: string;
  artistResident: boolean;
  intro?: string;
  biography?: string;
  tagline?: string;
  dateCreated?: string;
  instagram?: string;
  soundcloud?: string;
  twitter?: string;
  youtube?: string;
  facebook?: string;
  mixcloud?: string;
  website?: string;
  updatedAt: string;
  createdAt: string;
  _status: string;
}

interface ArtistsResponse {
  Artists: {
    docs: Artist[];
    totalDocs: number;
    limit: number;
    totalPages: number;
    page: number;
    pagingCounter: number;
    hasPrevPage: boolean;
    hasNextPage: boolean;
    prevPage?: number;
    nextPage?: number;
  };
}

const ArtistsTable: React.FC = () => {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState<keyof Artist>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedArtist, setSelectedArtist] = useState<Artist | null>(null);
  const itemsPerPage = 10;

  // Fetch all artists
  const fetchAllArtists = async () => {
    setIsLoading(true);
    try {
      let allArtists: Artist[] = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const query = `
          query GetArtists($page: Int, $limit: Int) {
            Artists(page: $page, limit: $limit) {
              docs {
                id
                artistName
                slug
                artistResident
                intro
                biography
                tagline
                dateCreated
                instagram
                soundcloud
                twitter
                youtube
                facebook
                mixcloud
                website
                updatedAt
                createdAt
                _status
              }
              totalDocs
              limit
              totalPages
              page
              hasNextPage
            }
          }
        `;

        const response = await graphqlClient.request<ArtistsResponse>(query, {
          page,
          limit: 100
        });

        const artistsData = response.Artists;
        allArtists = [...allArtists, ...artistsData.docs];

        if (!artistsData.hasNextPage) {
          hasMore = false;
        } else {
          page++;
        }
      }

      setArtists(allArtists);
    } catch (error) {
      console.error("Error fetching artists:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllArtists();
  }, []);

  // Filter and sort artists
  const filteredAndSortedArtists = useMemo(() => {
    const filtered = artists.filter((artist) =>
      artist.artistName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artist.slug?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      artist.tagline?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort artists
    filtered.sort((a, b) => {
      let aValue: string | number | boolean | undefined = a[sortField];
      let bValue: string | number | boolean | undefined = b[sortField];

      // Handle date fields
      if (sortField === "createdAt" || sortField === "updatedAt" || sortField === "dateCreated") {
        aValue = new Date(aValue as string).getTime();
        bValue = new Date(bValue as string).getTime();
      }

      // Handle string comparison
      if (typeof aValue === "string" && typeof bValue === "string") {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      // Handle boolean comparison
      if (typeof aValue === "boolean" && typeof bValue === "boolean") {
        aValue = aValue ? 1 : 0;
        bValue = bValue ? 1 : 0;
      }

      // Handle undefined values
      if (aValue === undefined && bValue === undefined) return 0;
      if (aValue === undefined) return 1;
      if (bValue === undefined) return -1;

      if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
      if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [artists, searchTerm, sortField, sortDirection]);

  // Paginate artists
  const paginatedArtists = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedArtists.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedArtists, currentPage]);

  const totalPages = Math.ceil(filteredAndSortedArtists.length / itemsPerPage);

  // Handle sort
  const handleSort = (field: keyof Artist) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get social media links
  const getSocialLinks = (artist: Artist) => {
    const links = [];
    if (artist.instagram) links.push({ name: "Instagram", url: artist.instagram, icon: "📷" });
    if (artist.soundcloud) links.push({ name: "SoundCloud", url: artist.soundcloud, icon: "🎵" });
    if (artist.twitter) links.push({ name: "Twitter", url: artist.twitter, icon: "🐦" });
    if (artist.youtube) links.push({ name: "YouTube", url: artist.youtube, icon: "📺" });
    if (artist.facebook) links.push({ name: "Facebook", url: artist.facebook, icon: "👥" });
    if (artist.mixcloud) links.push({ name: "Mixcloud", url: artist.mixcloud, icon: "🎧" });
    if (artist.website) links.push({ name: "Website", url: artist.website, icon: "🌐" });
    return links;
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "400px" 
      }}>
        <Loader />
      </div>
    );
  }

  return (
    <div style={{ 
      border: "1px solid #e0e0e0", 
      borderRadius: "8px", 
      backgroundColor: "white",
      overflow: "hidden"
    }}>
      {/* Header */}
      <div style={{ 
        padding: "20px", 
        borderBottom: "1px solid #e0e0e0",
        background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)"
      }}>
        <div style={{ 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          marginBottom: "16px"
        }}>
          <div>
            <h2 style={{ 
              fontSize: "24px", 
              fontWeight: "600", 
              color: "#333",
              margin: "0 0 8px 0"
            }}>
              Artists Directory
            </h2>
            <p style={{ 
              color: "#666", 
              margin: "0",
              fontSize: "14px"
            }}>
              {filteredAndSortedArtists.length} artists found
            </p>
          </div>
          <button
            onClick={fetchAllArtists}
            style={{
              padding: "8px 16px",
              borderRadius: "6px",
              border: "1px solid #FF8C00",
              backgroundColor: "#FF8C00",
              color: "white",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500"
            }}
          >
            🔄 Refresh
          </button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search artists by name, slug, or tagline..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "6px",
            border: "1px solid #e0e0e0",
            fontSize: "14px",
            outline: "none",
            transition: "border-color 0.2s"
          }}
        />
      </div>

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f8f9fa" }}>
            <tr>
              <th style={{ 
                padding: "12px", 
                textAlign: "left", 
                borderBottom: "1px solid #e0e0e0",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }} onClick={() => handleSort("artistName")}>
                Artist Name {sortField === "artistName" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th style={{ 
                padding: "12px", 
                textAlign: "left", 
                borderBottom: "1px solid #e0e0e0",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }}>
                Status
              </th>
              <th style={{ 
                padding: "12px", 
                textAlign: "left", 
                borderBottom: "1px solid #e0e0e0",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }}>
                Resident
              </th>
              <th style={{ 
                padding: "12px", 
                textAlign: "left", 
                borderBottom: "1px solid #e0e0e0",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }} onClick={() => handleSort("createdAt")}>
                Created {sortField === "createdAt" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th style={{ 
                padding: "12px", 
                textAlign: "left", 
                borderBottom: "1px solid #e0e0e0",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }}>
                Social Links
              </th>
              <th style={{ 
                padding: "12px", 
                textAlign: "center", 
                borderBottom: "1px solid #e0e0e0",
                fontSize: "14px",
                fontWeight: "600",
                color: "#333"
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedArtists.map((artist, index) => (
              <tr 
                key={artist.id} 
                style={{ 
                  borderBottom: "1px solid #f0f0f0",
                  backgroundColor: index % 2 === 0 ? "#fafafa" : "white"
                }}
              >
                <td style={{ padding: "12px" }}>
                  <div>
                    <div style={{ 
                      fontWeight: "500", 
                      fontSize: "14px", 
                      color: "#333",
                      marginBottom: "4px"
                    }}>
                      {artist.artistName || "N/A"}
                    </div>
                    <div style={{ 
                      fontSize: "12px", 
                      color: "#666" 
                    }}>
                      /{artist.slug}
                    </div>
                    {artist.tagline && (
                      <div style={{ 
                        fontSize: "12px", 
                        color: "#888",
                        fontStyle: "italic",
                        marginTop: "2px"
                      }}>
                        {artist.tagline}
                      </div>
                    )}
                  </div>
                </td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    backgroundColor: artist._status === "published" ? "#e7f5e7" : "#fff3cd",
                    color: artist._status === "published" ? "#28a745" : "#856404"
                  }}>
                    {artist._status}
                  </span>
                </td>
                <td style={{ padding: "12px" }}>
                  <span style={{
                    fontSize: "16px"
                  }}>
                    {artist.artistResident ? "✅" : "❌"}
                  </span>
                </td>
                <td style={{ padding: "12px", fontSize: "12px", color: "#666" }}>
                  {formatDate(artist.dateCreated || artist.createdAt)}
                </td>
                <td style={{ padding: "12px" }}>
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {getSocialLinks(artist).map((link, i) => (
                      <a
                        key={i}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={link.name}
                        style={{
                          textDecoration: "none",
                          fontSize: "16px",
                          padding: "4px",
                          borderRadius: "4px",
                          transition: "background-color 0.2s"
                        }}
                      >
                        {link.icon}
                      </a>
                    ))}
                  </div>
                </td>
                <td style={{ padding: "12px", textAlign: "center" }}>
                  <button
                    onClick={() => setSelectedArtist(artist)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "4px",
                      border: "1px solid #FF8C00",
                      backgroundColor: "transparent",
                      color: "#FF8C00",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontWeight: "500",
                      transition: "all 0.2s"
                    }}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ 
        padding: "16px", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        borderTop: "1px solid #e0e0e0",
        backgroundColor: "#f8f9fa"
      }}>
        <div style={{ fontSize: "14px", color: "#666" }}>
          Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedArtists.length)} of {filteredAndSortedArtists.length} artists
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #e0e0e0",
              backgroundColor: currentPage === 1 ? "#f5f5f5" : "white",
              color: currentPage === 1 ? "#999" : "#333",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              fontSize: "14px"
            }}
          >
            Previous
          </button>
          <span style={{ 
            padding: "8px 12px", 
            fontSize: "14px", 
            color: "#666" 
          }}>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: "8px 12px",
              borderRadius: "4px",
              border: "1px solid #e0e0e0",
              backgroundColor: currentPage === totalPages ? "#f5f5f5" : "white",
              color: currentPage === totalPages ? "#999" : "#333",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              fontSize: "14px"
            }}
          >
            Next
          </button>
        </div>
      </div>

      {/* Artist Detail Modal */}
      {selectedArtist && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: "white",
            borderRadius: "8px",
            padding: "24px",
            maxWidth: "600px",
            maxHeight: "80vh",
            overflow: "auto",
            margin: "20px",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)"
          }}>
            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "start",
              marginBottom: "20px"
            }}>
              <h3 style={{ 
                fontSize: "24px", 
                fontWeight: "600", 
                color: "#333",
                margin: "0"
              }}>
                {selectedArtist.artistName}
              </h3>
              <button
                onClick={() => setSelectedArtist(null)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                  color: "#999",
                  padding: "0",
                  width: "30px",
                  height: "30px"
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gap: "16px" }}>
              {selectedArtist.tagline && (
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>
                    TAGLINE
                  </h4>
                  <p style={{ fontSize: "16px", color: "#333", margin: "0", fontStyle: "italic" }}>
                    {selectedArtist.tagline}
                  </p>
                </div>
              )}

              {selectedArtist.intro && (
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>
                    INTRO
                  </h4>
                  <p style={{ fontSize: "14px", color: "#555", margin: "0", lineHeight: "1.5" }}>
                    {selectedArtist.intro}
                  </p>
                </div>
              )}

              {selectedArtist.biography && (
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>
                    BIOGRAPHY
                  </h4>
                  <p style={{ fontSize: "14px", color: "#555", margin: "0", lineHeight: "1.5" }}>
                    {selectedArtist.biography}
                  </p>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>
                    STATUS
                  </h4>
                  <span style={{
                    padding: "4px 8px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    backgroundColor: selectedArtist._status === "published" ? "#e7f5e7" : "#fff3cd",
                    color: selectedArtist._status === "published" ? "#28a745" : "#856404"
                  }}>
                    {selectedArtist._status}
                  </span>
                </div>

                <div>
                  <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>
                    RESIDENT ARTIST
                  </h4>
                  <span style={{ fontSize: "16px" }}>
                    {selectedArtist.artistResident ? "✅ Yes" : "❌ No"}
                  </span>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: "14px", fontWeight: "600", color: "#666", margin: "0 0 8px 0" }}>
                  SOCIAL LINKS
                </h4>
                <div style={{ display: "grid", gap: "8px" }}>
                  {getSocialLinks(selectedArtist).map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px",
                        borderRadius: "4px",
                        backgroundColor: "#f8f9fa",
                        textDecoration: "none",
                        color: "#333",
                        fontSize: "14px",
                        transition: "background-color 0.2s"
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>{link.icon}</span>
                      {link.name}
                    </a>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", fontSize: "12px", color: "#666" }}>
                <div>
                  <strong>Created:</strong> {formatDate(selectedArtist.dateCreated || selectedArtist.createdAt)}
                </div>
                <div>
                  <strong>Updated:</strong> {formatDate(selectedArtist.updatedAt)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArtistsTable;