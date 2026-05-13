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

  const [categories] = useGet("admin/categories");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState([]);

  const toggleCategory = (id) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
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
          if (newId && selectedCategoryIds.length) {
            try {
              await axiosInstance.post(
                `/admin/topup-product/${newId}/categories`,
                {
                  category_ids: selectedCategoryIds,
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
                  <label className="block mb-2 font-semibold">Categories</label>
                  <div className="flex flex-wrap gap-2">
                    {(categories || []).map((c) => (
                      <label
                        key={c.id}
                        className={`px-3 py-1 border rounded cursor-pointer select-none ${selectedCategoryIds.includes(c.id) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300"}`}
                      >
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={selectedCategoryIds.includes(c.id)}
                          onChange={() => toggleCategory(c.id)}
                        />
                        <span className="mr-1">{c.emoji}</span>
                        {c.name}
                      </label>
                    ))}
                    {(!categories || categories.length === 0) && (
                      <span className="text-sm text-gray-500">
                        No categories yet — create some in /categories
                      </span>
                    )}
                  </div>
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
