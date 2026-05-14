import React, { useRef, useState } from "react";
import { useHistory } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import useUpload from "../../hooks/useUpload";
import { getErrors, toastDefault } from "../../utils/handler.utils";
import Loader from "../Loader/Loader";
import { Editor } from "react-draft-wysiwyg";
import "react-draft-wysiwyg/dist/react-draft-wysiwyg.css";
import { EditorState } from "draft-js";
import { convertToHTML } from "draft-convert";

function AddTopupProduct() {
  const name = useRef(null);
  const logo = useRef(null);
  const isactivefortopup = useRef(null);
  const is_active_product = useRef(null);

  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  const [productLogo, setProductLogo] = useState(null);
  const { path, uploading } = useUpload(productLogo);

  const [catRefresh, setCatRefresh] = useState(0);
  const [categories] = useGet("admin/categories", undefined, catRefresh);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Inline-create state. The select shows a sentinel "__create__" option that
  // toggles a small form for adding a category without leaving the page.
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  const handleCategorySelect = (e) => {
    const value = e.target.value;
    if (value === "__create__") {
      setIsCreatingCat(true);
      return;
    }
    setIsCreatingCat(false);
    setSelectedCategoryId(value);
  };

  const submitNewCategory = async () => {
    const name = newCatName.trim();
    if (!name) {
      toast.error("Enter a category name", toastDefault);
      return;
    }
    setCreatingCat(true);
    try {
      const res = await axiosInstance.post("/admin/category/create", {
        name,
        emoji: newCatEmoji.trim(),
        serial: 0,
        is_active: 1,
      });
      const created = res?.data?.data;
      setNewCatName("");
      setNewCatEmoji("");
      setIsCreatingCat(false);
      setCatRefresh((n) => n + 1);
      if (created?.id) setSelectedCategoryId(String(created.id));
      toast.success("Category created", toastDefault);
    } catch (err) {
      toast.error(getErrors(err, false, true), toastDefault);
    } finally {
      setCreatingCat(false);
    }
  };

  const [loading, setLoading] = useState(null);
  const history = useHistory();

  const createProductHandler = (e) => {
    e.preventDefault();

    if (!uploading) {
      setLoading(true);
      axiosInstance
        .post("/admin/topup-product/create", {
          name: name.current.value,
          logo: path,
          price: 1,
          isactivefortopup: isactivefortopup.current.checked ? 1 : 0,
          is_active: is_active_product.current.checked ? 1 : 0,
          is_offer: 0,
          offer_items:  0,
          rules: convertToHTML(editorState.getCurrentContent()),
        })
        .then(async (res) => {
          const newId = res?.data?.data?.id;
          // Send the single selection as a 1-element array. The endpoint
          // wipes previous links before inserting, so this acts as a replace.
          if (newId) {
            try {
              await axiosInstance.post(
                `/admin/topup-product/${newId}/categories`,
                {
                  category_ids: selectedCategoryId ? [Number(selectedCategoryId)] : [],
                },
              );
            } catch (e) {
              /* ignore */
            }
          }
          toast.success("Product created successfully", toastDefault);

          setTimeout(() => {
            history.push("/topup-product");
          }, 1500);
        })
        .catch((err) => {
          toast.error(getErrors(err, false, true), toastDefault);
          setLoading(false);
        });
    }
  };

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-black">Create new product</h3>
        </div>
        <div className="py-10 px-4">
          <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
            {loading && <Loader absolute />}
            <form onSubmit={createProductHandler}>
              <div>
                <div className="form_grid">
                  <div>
                    <label htmlFor="name">Name</label>
                    <input
                      ref={name}
                      id="name"
                      className="form_input"
                      type="text"
                      placeholder="Name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="logo">Logo</label>
                    <input
                      ref={logo}
                      id="logo"
                      className="form_input"
                      type="file"
                      required
                      onChange={(e) => setProductLogo(e.target.files[0])}
                    />
                  </div>
                </div>

                <div className="my-3">
                  <label htmlFor="category" className="block mb-2 font-semibold">
                    Category
                  </label>
                  <select
                    id="category"
                    className="form_input"
                    value={isCreatingCat ? "__create__" : selectedCategoryId}
                    onChange={handleCategorySelect}
                  >
                    <option value="">-- Select category --</option>
                    {(categories || []).map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.emoji ? `${c.emoji} ` : ""}
                        {c.name}
                      </option>
                    ))}
                    <option value="__create__">+ Create new category…</option>
                  </select>

                  {isCreatingCat && (
                    <div className="mt-3 p-3 border border-dashed border-gray-300 rounded bg-gray-50">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
                        <div className="flex-1">
                          <label className="text-xs text-gray-600 block mb-1">
                            Name
                          </label>
                          <input
                            type="text"
                            className="form_input"
                            placeholder="e.g. Mobile Games"
                            value={newCatName}
                            onChange={(e) => setNewCatName(e.target.value)}
                          />
                        </div>
                        <div className="sm:w-24">
                          <label className="text-xs text-gray-600 block mb-1">
                            Emoji
                          </label>
                          <input
                            type="text"
                            className="form_input"
                            placeholder="🎮"
                            value={newCatEmoji}
                            onChange={(e) => setNewCatEmoji(e.target.value)}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={creatingCat}
                            onClick={submitNewCategory}
                            className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-60"
                          >
                            {creatingCat ? "Adding…" : "Add"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setIsCreatingCat(false);
                              setNewCatName("");
                              setNewCatEmoji("");
                            }}
                            className="px-3 py-2 bg-gray-200 text-gray-700 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Editor
                  editorState={editorState}
                  editorStyle={{
                    height: 300,
                  }}
                  wrapperStyle={{
                    border: "1px solid #dcdcf3",
                    borderRadius: 6,
                  }}
                  onEditorStateChange={(e) => setEditorState(e)}
                />

                <div className="my-2">
                  <label className="py-2 inline-block cursor-pointer select-none">
                    <input
                      type="checkbox"
                      ref={isactivefortopup}
                      className="mr-2"
                    />
                    Is active for Id Code
                  </label>
                </div>
                <div className="my-2">
                  <label className="py-2 inline-block cursor-pointer select-none">
                    <input
                      type="checkbox"
                      defaultChecked
                      ref={is_active_product}
                      className="mr-2"
                    />
                    Is active product
                  </label>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="cstm_btn w-full block"
                  >
                    Create Product
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AddTopupProduct;
