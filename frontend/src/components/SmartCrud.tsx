"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

export default function SmartCRUD({ title, endpoint, fields }) {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({});
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    const res = await axios.get(endpoint);
    setItems(res.data);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async () => {
    if (editingId) {
      await axios.put(`${endpoint}/${editingId}`, form);
    } else {
      await axios.post(endpoint, form);
    }

    setOpen(false);
    setForm({});
    setEditingId(null);
    fetchData();
  };

  const handleEdit = (item) => {
    setForm(item);
    setEditingId(item.id);
    setOpen(true);
  };

  const handleDelete = async (id) => {
    await axios.delete(`${endpoint}/${id}`);
    fetchData();
  };

  return (
    <div className="p-4 space-y-4">

      {/* Title + Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">{title}</h2>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button>Add</Button>
          </SheetTrigger>

          <SheetContent side="bottom" className="p-4 space-y-3">
            {fields.map((f) => (
              <Input
                key={f.name}
                placeholder={f.label}
                value={form[f.name] || ""}
                onChange={(e) =>
                  setForm({ ...form, [f.name]: e.target.value })
                }
              />
            ))}

            <Button className="w-full" onClick={handleSubmit}>
              Save
            </Button>
          </SheetContent>
        </Sheet>
      </div>

      {/* Item List */}
      <div className="space-y-3">
        {items.map((item) => (
          <Card
            key={item.id}
            className="p-3 flex justify-between items-center"
          >
            <CardContent className="p-0">
              {Object.entries(item).map(([key, value]) => (
                key !== "id" && (
                  <p key={key} className="text-sm">
                    <strong>{key.replace(/_/g, " ")}:</strong> {String(value)}
                  </p>
                )
              ))}
            </CardContent>

            <div className="flex gap-2">
              <Button size="sm" onClick={() => handleEdit(item)}>
                Edit
              </Button>

              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(item.id)}
              >
                Delete
              </Button>
            </div>
          </Card>
        ))}
      </div>

    </div>
  );
}
