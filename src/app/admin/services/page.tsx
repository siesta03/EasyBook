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
  Sparkles,
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
    const defaultCat =
      selectedCategoryTab !== "ALL"
        ? selectedCategoryTab
        : PHOTOSHOOT_CATEGORIES[0];
    const meta = CATEGORY_METADATA[defaultCat as PhotoshootCategory];

    setEditingService(null);
    setName("");
    setCategory(defaultCat);
    setDescription("");
    setPrice("250.00");
    setDurationMinutes("60");
    setBufferMinutes(String(meta?.defaultBufferMinutes ?? 30));
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (svc: ServicePackage) => {
    setEditingService(svc);
    setName(svc.name);
    setCategory(svc.category || PHOTOSHOOT_CATEGORIES[0]);
    setDescription(svc.description);
    setPrice(String(svc.price));
    setDurationMinutes(String(svc.durationMinutes));
    setBufferMinutes(String(svc.bufferMinutes));
    setIsActive(svc.isActive);
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
    setIsSubmitting(true);
    setFormError(null);

    const payload = {
      name,
      category,
      description,
      price: Number(price),
      durationMinutes: Number(durationMinutes),
      bufferMinutes: Number(bufferMinutes),
      isActive,
    };

    try {
      let res;
      if (editingService) {
        res = await fetch("/api/admin/services", {
          method: "PATCH",
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

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save service package");
      }

      setIsModalOpen(false);
      fetchServices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSeedDefaults = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed_defaults" }),
      });
      if (res.ok) {
        await fetchServices();
      }
    } catch (err) {
      console.error("Failed to seed defaults:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete or deactivate this service package?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/services?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete service");
      }

      fetchServices();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error deleting service";
      alert(msg);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
            Services, Categories &amp; Buffer Intervals
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Configure photoshoot packages by category (Indoor, Outdoor, Wedding, Sport, Product), Malaysia Ringgit (RM) pricing, duration, and turnaround buffers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={handleSeedDefaults}
            disabled={isSeeding}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-slate-300 hover:text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
            {isSeeding ? "Syncing Categories..." : "Ensure All 5 Category Packages"}
          </button>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Package
          </button>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedCategoryTab("ALL")}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
            selectedCategoryTab === "ALL"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
              : "bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white"
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          All Categories ({services.length})
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
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer ${
                active
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-white/[0.03] border border-white/10 text-slate-400 hover:text-white"
              }`}
            >
              <span>{cat}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  active ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
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
        <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
          <p className="text-xs">Loading services &amp; categories...</p>
        </div>
      ) : filteredServices.length === 0 ? (
        <div className="py-16 text-center text-slate-500 border border-dashed border-white/5 rounded-3xl">
          <Camera className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="text-base font-semibold text-slate-300">
            No packages configured in this category
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Click &ldquo;Add New Package&rdquo; or &ldquo;Ensure All 5 Category Packages&rdquo; above.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredServices.map((svc) => (
            <div
              key={svc.id}
              className={`glass-panel p-6 rounded-3xl border transition-all flex flex-col justify-between ${
                svc.isActive
                  ? "border-white/10 hover:border-indigo-500/30"
                  : "border-white/5 opacity-60 bg-black/20"
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getCategoryBadgeClass(
                        svc.category
                      )}`}
                    >
                      {svc.category || "Indoor Photoshoot"}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        svc.isActive
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
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
                      className="p-1.5 rounded-lg border border-white/5 hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(svc.id)}
                      title="Delete / Deactivate"
                      className="p-1.5 rounded-lg border border-white/5 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{svc.name}</h3>
                <p className="text-xs text-slate-400 leading-relaxed mb-6">
                  {svc.description}
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    Shoot Duration:
                  </span>
                  <span className="font-semibold text-white">
                    {svc.durationMinutes} mins
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-pink-400" />
                    Transit / Setup Buffer:
                  </span>
                  <span className="font-semibold text-white">
                    +{svc.bufferMinutes} mins
                  </span>
                </div>
                <div className="pt-2 flex items-baseline justify-between border-t border-white/5">
                  <span className="text-[11px] text-slate-500">
                    Price (Malaysia Ringgit)
                  </span>
                  <span className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-pink-300">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="max-w-lg w-full glass-card p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-white">
              {editingService
                ? "Edit Service Package & Buffer"
                : "Create Service Package & Buffer"}
            </h3>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              {/* Category Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Photoshoot Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => handleCategoryChangeInModal(e.target.value)}
                  className="w-full px-4 py-2.5 bg-[#121521] border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                >
                  {PHOTOSHOOT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Customers will select this category first before seeing this package.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Package Title *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Studio Portrait & Headshots"
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                  Description *
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details of coverage, retouched images, backdrops or locations..."
                  className="w-full px-4 py-2.5 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Price (RM) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="250.00"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Duration (Min) *
                  </label>
                  <input
                    type="number"
                    required
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    placeholder="60"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                    Buffer (Min) *
                  </label>
                  <input
                    type="number"
                    required
                    value={bufferMinutes}
                    onChange={(e) => setBufferMinutes(e.target.value)}
                    placeholder="30"
                    className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 rounded-xl text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Quick Buffer Presets */}
              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-400 mr-1">Quick Buffer Preset:</span>
                {[15, 20, 30, 45, 60, 90].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setBufferMinutes(String(m))}
                    className={`px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                      Number(bufferMinutes) === m
                        ? "bg-pink-500/20 border-pink-500/40 text-pink-300 font-bold"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
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
                  className="rounded border-white/10 bg-white/5 text-indigo-600 focus:ring-indigo-500/50 w-4 h-4"
                />
                <label
                  htmlFor="isActive"
                  className="text-xs text-slate-300 select-none cursor-pointer"
                >
                  Active (Display publicly under {category} on customer booking wizard)
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
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
