import { convertFromHTML, convertToHTML } from "draft-convert";
import { EditorState } from "draft-js";
import { Editor } from "react-draft-wysiwyg";
import { useEffect, useRef, useState } from "react";
import { useHistory, withRouter } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import useUpload from "../../hooks/useUpload";
import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import Loader from "../Loader/Loader";
function EditTopupProduct(props) {
  const history = useHistory();
  const productId = props.match.params.id;

  const [loading, setLoading] = useState(null);
  const [data, loadingData, error] = useGet(`admin/topup-product/${productId}`);
  const [productLogo, setProductLogo] = useState(data?.logo);
  const { path, uploading } = useUpload(productLogo);

  const [editorState, setEditorState] = useState(EditorState.createEmpty());
  useEffect(() => {
    if (hasData(data?.rules)) {
      setEditorState(
        EditorState.createWithContent(convertFromHTML(data?.rules)),
      );
    }
  }, [data]);

  const name = useRef(null);
  const logo = useRef(null);

  const serial = useRef(null);
  const isactivefortopup = useRef(null);
  const is_active_product = useRef(null);

  const [catRefresh, setCatRefresh] = useState(0);
  const [categories] = useGet("admin/categories", undefined, catRefresh);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Inline-create state — sentinel "__create__" in the select toggles a form.
  const [isCreatingCat, setIsCreatingCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // If the product already has categories, pick the first as the single
  // selection (the multi-select is being collapsed to single-select).
  useEffect(() => {
    if (data && Array.isArray(data.categories) && data.categories.length > 0) {
      setSelectedCategoryId(String(data.categories[0].id));
    }
  }, [data]);

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

  const editProductHandler = (e) => {
    e.preventDefault();
    setLoading(true);
    axiosInstance
      .post(`/admin/topup-product/update/${productId}`, {
        name: name.current.value,
        logo: path || data?.logo,
        price: 1,
        serial: serial.current.value,
        rules: convertToHTML(editorState.getCurrentContent()),
        isactivefortopup: isactivefortopup.current.checked ? 1 : 0,
        is_active: is_active_product.current.checked ? 1 : 0,
        is_offer: 0,
        offer_items: 0,
      })
      .then(async () => {
        try {
          // The endpoint replaces the link rows on every call, so passing a
          // 1-element array enforces a single-category assignment.
          await axiosInstance.post(
            `/admin/topup-product/${productId}/categories`,
            {
              category_ids: selectedCategoryId ? [Number(selectedCategoryId)] : [],
            },
          );
        } catch (e) {
          /* ignore */
        }
        toast.success("Product updated successfully", toastDefault);

        setTimeout(() => {
          history.push("/topup-product");
        }, 1500);
      })
      .catch((err) => {
        toast.error(getErrors(err, false, true), toastDefault);
        setLoading(false);
      });
  };

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200">
          <h3 className="text-lg font-bold text-black">
            Edit product {`{ ${data?.name} }`}
          </h3>
        </div>
        <div className="py-10 px-4">
          <div className="w-full md:w-[70%] mx-auto py-6 relative border border-gray-200 px-4">
            {loadingData && <Loader absolute />}
            {loading && <Loader absolute />}
            <form onSubmit={editProductHandler} className="min-h-[250px]">
              {hasData(data, loading, error) && (
                <div>
                  <div className="form_grid">
                    <div>
                      <label htmlFor="name">Name</label>
                      <input
                        ref={name}
                        id="name"
                        defaultValue={data?.name}
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
                        onChange={(e) => setProductLogo(e.target.files[0])}
                      />
                    </div>
                  </div>
                  <div className="form_grid">
                    <div>
                      <label htmlFor="serial">Serial</label>
                      <input
                        ref={serial}
                        defaultValue={data?.serial}
                        id="serial"
                        className="form_input"
                        type="number"
                        placeholder="serial"
                        required
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
                        defaultChecked={data?.isactivefortopup == 1}
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
                        defaultChecked={data?.is_active == 1}
                        ref={is_active_product}
                        className="mr-2"
                      />
                      Is active product
                    </label>
                  </div>

                  <div>
                    <button
                      disabled={uploading}
                      type="submit"
                      className="cstm_btn w-full block"
                    >
                      Edit Product
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export default withRouter(EditTopupProduct);
