"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Archive, Box, Edit3, PackageOpen, Plus, Search } from "lucide-react";
import type { InventoryItem } from "@/domain/types";
import { useApp } from "@/components/app-provider";
import {
  Button,
  Card,
  Field,
  Modal,
  PageHeader,
  StatusBadge,
} from "@/components/ui";

export function InventoryPage() {
  const { snapshot, mutate, busy } = useApp();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("active");
  const [selected, setSelected] = useState<InventoryItem | null | "new">(null);
  const inventory = useMemo(
    () =>
      snapshot.inventory.filter(
        (item) =>
          `${item.name} ${item.category} ${item.manufacturer} ${item.model} ${item.tags.join(" ")}`
            .toLowerCase()
            .includes(query.toLowerCase()) &&
          (status === "all" ||
            (status === "active" && item.status !== "archived") ||
            item.status === status),
      ),
    [snapshot.inventory, query, status],
  );

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const ok = await mutate(
      {
        action: "save-inventory",
        ...(selected && selected !== "new" ? { id: selected.id } : {}),
        data: {
          name: form.get("name"),
          category: form.get("category"),
          manufacturer: form.get("manufacturer"),
          model: form.get("model"),
          serialNumber: form.get("serialNumber"),
          status: form.get("status"),
          location: form.get("location"),
          assignedDeviceId: form.get("assignedDeviceId") || null,
          notes: form.get("notes"),
          tags: String(form.get("tags") ?? "")
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        },
      },
      selected === "new" ? "Inventory item added" : "Inventory item updated",
    );
    if (ok) setSelected(null);
  }

  return (
    <>
      <PageHeader
        eyebrow="Hardware registry"
        title="Inventory"
        description="Track lab equipment, spares, warranty context, and device assignments."
        actions={
          <Button onClick={() => setSelected("new")}>
            <Plus size={15} />
            Add item
          </Button>
        }
      />
      <section className="operations-summary">
        <Card>
          <PackageOpen />
          <span>
            <small>Tracked assets</small>
            <strong>
              {
                snapshot.inventory.filter((item) => item.status !== "archived")
                  .length
              }
            </strong>
          </span>
        </Card>
        <Card>
          <Box />
          <span>
            <small>In use</small>
            <strong>
              {
                snapshot.inventory.filter((item) => item.status === "in-use")
                  .length
              }
            </strong>
          </span>
        </Card>
        <Card>
          <Archive />
          <span>
            <small>Spare</small>
            <strong>
              {
                snapshot.inventory.filter((item) => item.status === "spare")
                  .length
              }
            </strong>
          </span>
        </Card>
        <Card>
          <Edit3 />
          <span>
            <small>Maintenance</small>
            <strong>
              {
                snapshot.inventory.filter(
                  (item) => item.status === "maintenance",
                ).length
              }
            </strong>
          </span>
        </Card>
      </section>
      <Card>
        <div className="toolbar">
          <div className="toolbar-group">
            <div className="input-wrap device-search">
              <Search size={15} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search inventory…"
                aria-label="Search inventory"
              />
            </div>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="active">Active inventory</option>
              <option value="all">All records</option>
              <option value="in-use">In use</option>
              <option value="spare">Spare</option>
              <option value="maintenance">Maintenance</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table inventory-table">
            <thead>
              <tr>
                <th>Asset</th>
                <th>Status</th>
                <th>Manufacturer / model</th>
                <th>Serial</th>
                <th>Location</th>
                <th>Assigned device</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const device = snapshot.devices.find(
                  (deviceItem) => deviceItem.id === item.assignedDeviceId,
                );
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="table-primary">
                        <div className="device-icon">
                          <PackageOpen size={15} />
                        </div>
                        <span>
                          {item.name}
                          <small>
                            {item.category} · {item.tags.join(", ")}
                          </small>
                        </span>
                      </div>
                    </td>
                    <td>
                      <StatusBadge status={item.status} />
                    </td>
                    <td>
                      {item.manufacturer} {item.model}
                    </td>
                    <td>
                      <code>{item.serialNumber || "—"}</code>
                    </td>
                    <td>{item.location || "Unassigned"}</td>
                    <td>{device?.displayName ?? "—"}</td>
                    <td>
                      <div className="table-actions">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelected(item)}
                          aria-label={`Edit ${item.name}`}
                        >
                          <Edit3 size={14} />
                        </Button>
                        {item.status !== "archived" ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              mutate(
                                { action: "archive-inventory", id: item.id },
                                "Inventory item archived",
                              )
                            }
                            aria-label={`Archive ${item.name}`}
                          >
                            <Archive size={14} />
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <footer className="list-footer">
          <span>{inventory.length} inventory records</span>
          <span>Serial numbers are local data; no credentials are stored</span>
        </footer>
      </Card>
      <Modal
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={
          selected === "new" ? "Add inventory item" : "Edit inventory item"
        }
        description="Record useful ownership and maintenance details. All fields remain local."
      >
        <form key={selected === "new" ? "new" : selected?.id} onSubmit={save}>
          <div className="form-grid">
            <Field label="Asset name">
              <input
                name="name"
                required
                defaultValue={selected === "new" ? "" : selected?.name}
              />
            </Field>
            <Field label="Category">
              <input
                name="category"
                required
                defaultValue={selected === "new" ? "" : selected?.category}
                placeholder="Drive, cable, computer…"
              />
            </Field>
            <Field label="Manufacturer">
              <input
                name="manufacturer"
                defaultValue={selected === "new" ? "" : selected?.manufacturer}
              />
            </Field>
            <Field label="Model">
              <input
                name="model"
                defaultValue={selected === "new" ? "" : selected?.model}
              />
            </Field>
            <Field label="Serial number">
              <input
                name="serialNumber"
                defaultValue={selected === "new" ? "" : selected?.serialNumber}
              />
            </Field>
            <Field label="Status">
              <select
                name="status"
                defaultValue={selected === "new" ? "spare" : selected?.status}
              >
                <option value="in-use">In use</option>
                <option value="spare">Spare</option>
                <option value="maintenance">Maintenance</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Location">
              <input
                name="location"
                defaultValue={selected === "new" ? "" : selected?.location}
              />
            </Field>
            <Field label="Assigned device">
              <select
                name="assignedDeviceId"
                defaultValue={
                  selected === "new" ? "" : (selected?.assignedDeviceId ?? "")
                }
              >
                <option value="">Unassigned</option>
                {snapshot.devices.map((device) => (
                  <option value={device.id} key={device.id}>
                    {device.displayName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Tags" hint="Comma-separated">
              <input
                name="tags"
                defaultValue={
                  selected === "new" ? "" : selected?.tags.join(", ")
                }
              />
            </Field>
            <Field label="Notes">
              <textarea
                name="notes"
                defaultValue={selected === "new" ? "" : selected?.notes}
              />
            </Field>
          </div>
          <div className="form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSelected(null)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save item"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
