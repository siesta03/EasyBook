"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Plus,
  Sliders,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Camera,
  Layers,
  RefreshCw,
} from "lucide-react";
import {
  PHOTOSHOOT_CATEGORIES,
  CATEGORY_METADATA,
  PhotoshootCategory,
  formatMYR,
  getCategoryBadgeClass,
} from "@/lib/categories";

interface ServicePackage {
  id: string;
  name: string;
  category: string;
  description: string;
  price: string | number;
  durationMinutes: number;
  bufferMinutes: number;
  isActive: boolean;
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<ServicePackage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("ALL");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServicePackage | null>(
    null
  );

  // Form fields
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>(PHOTOSHOOT_CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("180.00");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [bufferMinutes, setBufferMinutes] = useState("30");
  const [isActive, setIsActive] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchServices = async () => {
    try {
      const res = await fetch("/api/admin/services");
      if (res.ok) {
        const data = await res.json();
        setServices(data);
      }
    } catch (err) {
      console.error("Failed to load services:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadServices() {
      try {
        const res = await fetch("/api/admin/services");
        if (res.ok) {
          const data = await res.json();
          if (!ignore) setServices(data);
        }
      } catch (err) {
        console.error("Failed to load services:", err);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadServices();

    return () => {
      ignore = true;
    };
  }, []);

  const filteredServices = useMemo(() => {
    if (selectedCategoryTab === "ALL") return services;
    return services.filter(
      (s) => (s.category || "Indoor Photoshoot") === selectedCategoryTab
    );
  }, [services, selectedCategoryTab]);

  const openCreateModal = () => {
    setEditingService(null);
    setName("");
    const defaultCat =
      selectedCategoryTab === "ALL"
        ? PHOTOSHOOT_CATEGORIES[0]
        : selectedCategoryTab;
    setCategory(defaultCat);
    setDescription("");
    setPrice("180.00");
    setDurationMinutes("60");
    const meta = CATEGORY_METADATA[defaultCat as PhotoshootCategory];
    setBufferMinutes(String(meta?.defaultBufferMinutes || 30));
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (service: ServicePackage) => {
    setEditingService(service);
    setName(service.name);
    setCategory(service.category || "Indoor Photoshoot");
    setDescription(service.description);
    setPrice(String(service.price));
    setDurationMinutes(String(service.durationMinutes));
    setBufferMinutes(String(service.bufferMinutes));
    setIsActive(service.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCategoryChangeInModal = (newCat: string) => {
    setCategory(newCat);
    if (!editingService) {
      const meta = CATEGORY_METADATA[newCat as PhotoshootCategory];
      if (meta) {
        setBufferMinutes(String(meta.defaultBufferMinutes));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const payload = {
        name,
        category,
        description,
        price: parseFloat(price),
        durationMinutes: parseInt(durationMinutes, 10),
        bufferMinutes: parseInt(bufferMinutes, 10),
        isActive,
      };

      let res;
      if (editingService) {
        res = await fetch("/api/admin/services", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingService.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save package");
      }

      await fetchServices();
      setIsModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission error";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to deactivate or remove this service package?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/services?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchServices();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete package");
      }
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_categories" }),
      });
      if (res.ok) {
        await fetchServices();
      }
    } catch (err) {
      console.error("Seeding failed:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f1f1f1] tracking-tight">
            Services &amp; Packages
          </h1>
          <p className="text-xs text-[#aaaaaa] mt-0.5">
            Configure photoshoot packages, category pricing (RM), and turnaround buffers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] text-xs font-medium transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
            <span>{isSeeding ? "Syncing..." : "Sync Defaults"}</span>
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] font-semibold text-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Package</span>
          </button>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => setSelectedCategoryTab("ALL")}
          className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer whitespace-nowrap ${
            selectedCategoryTab === "ALL"
              ? "bg-[#f1f1f1] text-[#0f0f0f] font-semibold"
              : "bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] hover:bg-[#333333]"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>All ({services.length})</span>
        </button>

        {PHOTOSHOOT_CATEGORIES.map((cat) => {
          const count = services.filter(
            (s) => (s.category || "Indoor Photoshoot") === cat
          ).length;
          const active = selectedCategoryTab === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategoryTab(cat)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? "bg-[#f1f1f1] text-[#0f0f0f] font-semibold"
                  : "bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] hover:bg-[#333333]"
              }`}
            >
              <span>{cat}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  active ? "bg-black/20 text-[#0f0f0f]" : "bg-[#1a1a1a] text-[#717171]"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Services Grid */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-[#aaaaaa] gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-[#aaaaaa]" />
          <p className="text-xs">Loading packages...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-16 text-center text-[#717171] bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl">
          <Camera className="w-9 h-9 mx-auto mb-2 opacity-40 text-[#717171]" />
          <p className="text-sm font-semibold text-[#aaaaaa]">
            No packages in this category
          </p>
          <p className="text-xs text-[#717171] mt-0.5">
            Click &ldquo;New Package&rdquo; or &ldquo;Sync Defaults&rdquo; above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className={`bg-[#1a1a1a] p-5 rounded-2xl border transition-colors flex flex-col justify-between ${
                svc.isActive
                  ? "border-[#2a2a2a] hover:border-[#383838]"
                  : "border-[#222222] opacity-60 bg-[#141414]"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${getCategoryBadgeClass(
                        svc.category
                      )}`}
                    >
                      {svc.category || "Indoor Photoshoot"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider ${
                        svc.isActive
                          ? "bg-[#0e2a1b] text-[#4ade80] border border-[#164e2d]"
                          : "bg-[#272727] text-[#aaaaaa] border border-[#383838]"
                      }`}
                    >
                      {svc.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => openEditModal(svc)}
                      title="Edit Package"
                      className="p-1.5 rounded-md border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#272727] text-[#aaaaaa] hover:text-[#f1f1f1] transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(svc.id)}
                      title="Delete / Deactivate"
                      className="p-1.5 rounded-md border border-[#2a2a2a] bg-[#1f1f1f] hover:bg-[#2e1414] text-[#aaaaaa] hover:text-[#f87171] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-[#f1f1f1] mb-1.5">
                  {svc.name}
                </h3>
                <p className="text-xs text-[#aaaaaa] leading-relaxed mb-4">
                  {svc.description}
                </p>
              </div>

              <div className="pt-3.5 border-t border-[#252525] space-y-2">
                <div className="flex items-center justify-between text-xs text-[#aaaaaa]">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#717171]" />
                    Shoot Duration:
                  </span>
                  <span className="font-medium text-[#f1f1f1]">
                    {svc.durationMinutes} mins
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#aaaaaa]">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#717171]" />
                    Transit / Setup Buffer:
                  </span>
                  <span className="font-medium text-[#f1f1f1]">
                    +{svc.bufferMinutes} mins
                  </span>
                </div>
                <div className="pt-2 flex items-baseline justify-between border-t border-[#252525]">
                  <span className="text-[11px] text-[#717171]">
                    Price (RM)
                  </span>
                  <span className="text-base font-bold text-[#f1f1f1]">
                    {formatMYR(svc.price)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Package Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="max-w-lg w-full bg-[#1f1f1f] p-6 rounded-2xl border border-[#303030] shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-[#f1f1f1]">
              {editingService
                ? "Edit Service Package"
                : "Create Service Package"}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-[#2e1414] border border-[#521c1c] text-[#fca5a5] text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-3.5">
              {/* Category Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                  Photoshoot Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChangeInModal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                >
                  {PHOTOSHOOT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                  Package Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Studio Portrait & Headshots"
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of coverage, retouched images, backdrops or locations..."
                  className="w-full px-3.5 py-2.5 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                    Price (RM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="250.00"
                    className="w-full px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                    Duration (Min) *
                  </label>
                  <input
                    type="number"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                    className="w-full px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#aaaaaa] uppercase tracking-wider mb-1">
                    Buffer (Min) *
                  </label>
                  <input
                    type="number"
                    required
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 bg-[#121212] border border-[#2a2a2a] rounded-xl text-[#f1f1f1] text-xs focus:outline-none focus:border-[#3ea6ff]"
                  />
                </div>
              </div>

              {/* Quick Buffer Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1">
                <span className="text-[#717171] mr-1">Quick Presets:</span>
                {[15, 20, 30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBufferMinutes(String(m))}
                    className={`px-2 py-0.5 rounded-full border text-[11px] transition cursor-pointer ${
                      Number(bufferMinutes) === m
                        ? "bg-[#f1f1f1] text-[#0f0f0f] border-transparent font-semibold"
                        : "bg-[#272727] border-[#383838] text-[#aaaaaa] hover:text-[#f1f1f1]"
                    }`}
                  >
                    +{m}m
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-[#2a2a2a] bg-[#121212] text-[#cc0000] focus:ring-[#cc0000] w-4 h-4 cursor-pointer"
                />
                <label
                  htmlFor="isActive"
                  className="text-xs text-[#aaaaaa] select-none cursor-pointer"
                >
                  Active (Display publicly on customer booking site)
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-[#2a2a2a]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-full border border-[#383838] text-[#aaaaaa] hover:text-[#f1f1f1] hover:bg-[#272727] text-xs font-medium cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f1f1f1] hover:bg-white text-[#0f0f0f] text-xs font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Package"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
