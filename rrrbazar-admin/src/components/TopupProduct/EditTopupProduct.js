import { useEffect, useRef, useState } from "react";
import { useHistory, withRouter } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import useUpload from "../../hooks/useUpload";
import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import TextEditor from "../TextEditor/TextEditor";
import Loader from "../Loader/Loader";
function EditTopupProduct(props) {
  const history = useHistory();
  const productId = props.match.params.id;

  const [loading, setLoading] = useState(null);
  const [data, loadingData, error] = useGet(`admin/topup-product/${productId}`);
  const [productLogo, setProductLogo] = useState(data?.logo);
  const { path, uploading } = useUpload(productLogo);

  const [rulesHtml, setRulesHtml] = useState("");
  useEffect(() => {
    if (data?.rules != null) setRulesHtml(data.rules || "");
  }, [data]);

  const name = useRef(null);
  const logo = useRef(null);

  const serial = useRef(null);
  const is_active_product = useRef(null);
  const is_voucher = useRef(null);
  // Mirrors the `is_voucher` checkbox so we can gate the Redeem link input.
  const [isVoucherChecked, setIsVoucherChecked] = useState(false);
  const [redeemLinkValue, setRedeemLinkValue] = useState("");

  // Passthrough product link + tutorial youtube link. When productLinkValue
  // is non-empty, the form hides everything that doesn't make sense for an
  // external/affiliate product.
  const [productLinkValue, setProductLinkValue] = useState("");
  const [youtubeLinkValue, setYoutubeLinkValue] = useState("");
  useEffect(() => {
    if (data) {
      if (typeof data.product_link === "string") setProductLinkValue(data.product_link);
      if (typeof data.youtube_link === "string") setYoutubeLinkValue(data.youtube_link);
      if (typeof data.redeem_link === "string") setRedeemLinkValue(data.redeem_link);
      setIsVoucherChecked(data.is_voucher == 1);
    }
  }, [data]);
  const isPassthrough = !!productLinkValue.trim();

  const [catRefresh, setCatRefresh] = useState(0);
  const [categories] = useGet("admin/categories", undefined, catRefresh);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");

  // Dynamic inputs (mirror of AddTopupProduct). Loaded from data.inputs.
  const PLAYER_ID_TITLE = "Player ID";
  const isPlayerIdTitle = (t) =>
    String(t || "").trim().toLowerCase() === PLAYER_ID_TITLE.toLowerCase();
  // See AddTopupProduct for verify_type semantics. verify_player_name is
  // still sent (derived) so older readers keep working.
  const newInputRow = () => ({
    _key: Math.random().toString(36).slice(2),
    title: "",
    verify_type: "none",
    verify_url: "",
    verify_game: "",
    api_token: "",
    region_lock: "",
  });

  // Same set as AddTopupProduct / AddPackage's PUBG-bot game dropdown.
  const GAMERSPAY_GAMES = [
    "pubg",
    "ff_mena",
    "ff_cis",
    "ff_sg",
    "ff_eu",
    "ff_bd",
    "ff_pk",
    "ff_latam",
    "ff_vn",
    "ff_tw",
    "ff_br",
    "ff_id",
  ];

  // Same region options as AddTopupProduct.
  const REGION_OPTIONS = [
    { value: "", label: "— No region lock —" },
    { value: "IND", label: "IND — India" },
    { value: "BD", label: "BD — Bangladesh" },
    { value: "PK", label: "PK — Pakistan" },
    { value: "ID", label: "ID — Indonesia" },
    { value: "BR", label: "BR — Brazil" },
    { value: "SG", label: "SG — Singapore" },
    { value: "MY", label: "MY — Malaysia" },
    { value: "TH", label: "TH — Thailand" },
    { value: "VN", label: "VN — Vietnam" },
    { value: "PH", label: "PH — Philippines" },
    { value: "TW", label: "TW — Taiwan" },
    { value: "ME", label: "ME — Middle East" },
    { value: "EU", label: "EU — Europe" },
    { value: "NA", label: "NA — North America" },
    { value: "SA", label: "SA — South America" },
    { value: "CIS", label: "CIS — CIS" },
  ];
  const [productInputs, setProductInputs] = useState([]);

  // Load existing inputs once the product data arrives. Sorted by serial.
  // Legacy rows that don't carry verify_type yet are coerced to 'dynamic'
  // when verify_player_name is on (preserves current behavior) and 'none'
  // otherwise.
  useEffect(() => {
    if (data && Array.isArray(data.inputs)) {
      const rows = [...data.inputs]
        .sort((a, b) => (a.serial || 0) - (b.serial || 0))
        .map((it) => {
          const explicit = String(it.verify_type || "").trim().toLowerCase();
          const verifyType = ["none", "dynamic", "gamerspay"].includes(explicit)
            ? explicit
            : it.verify_player_name
              ? "dynamic"
              : "none";
          return {
            _key: `srv-${it.id}`,
            title: it.title || "",
            verify_type: verifyType,
            verify_url: it.verify_url || "",
            verify_game: it.verify_game || "",
            api_token: it.api_token || "",
            region_lock: it.region_lock || "",
          };
        });
      setProductInputs(rows);
    }
  }, [data]);

  const updateInputAt = (idx, patch) => {
    setProductInputs((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  };
  const addInputRow = () =>
    setProductInputs((prev) => [...prev, newInputRow()]);
  const removeInputAt = (idx) =>
    setProductInputs((prev) => prev.filter((_, i) => i !== idx));

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

    // Validate dynamic inputs.
    const playerIdRows = productInputs.filter((it) => isPlayerIdTitle(it.title));
    if (playerIdRows.length > 1) {
      toast.error(
        `Only one input can use the reserved title "${PLAYER_ID_TITLE}".`,
        toastDefault,
      );
      return;
    }
    const hasEmptyTitle = productInputs.some((it) => !String(it.title || "").trim());
    if (hasEmptyTitle) {
      toast.error("Every dynamic input needs a title.", toastDefault);
      return;
    }

    // Per-type validation mirrors AddTopupProduct.
    const dynamicMissingTag = productInputs.find(
      (it) =>
        it.verify_type === "dynamic" &&
        String(it.verify_url || "").trim() &&
        !String(it.verify_url).includes("{value}"),
    );
    if (dynamicMissingTag) {
      toast.error(
        `Verify URL for "${dynamicMissingTag.title}" must include the {value} tag — that's where the entered ID is inserted.`,
        toastDefault,
      );
      return;
    }
    const dynamicEmptyUrl = productInputs.find(
      (it) =>
        it.verify_type === "dynamic" && !String(it.verify_url || "").trim(),
    );
    if (dynamicEmptyUrl) {
      toast.error(
        `Verify URL is required for "${dynamicEmptyUrl.title}" — switch back to "No name check" if you don't want verification.`,
        toastDefault,
      );
      return;
    }
    const gamerspayMissing = productInputs.find(
      (it) =>
        it.verify_type === "gamerspay" &&
        (!String(it.verify_game || "").trim() ||
          !String(it.api_token || "").trim()),
    );
    if (gamerspayMissing) {
      toast.error(
        `GamersPay verify on "${gamerspayMissing.title}" needs both a Game and an API key.`,
        toastDefault,
      );
      return;
    }

    const playerIdPresent = playerIdRows.length === 1;
    const isactivefortopupValue = playerIdPresent ? 1 : 0;

    setLoading(true);
    axiosInstance
      .post(`/admin/topup-product/update/${productId}`, {
        name: name.current.value,
        logo: path || data?.logo,
        price: 1,
        serial: serial.current.value,
        rules: isPassthrough ? "" : rulesHtml,
        isactivefortopup: isactivefortopupValue,
        is_active: is_active_product.current.checked ? 1 : 0,
        is_offer: 0,
        offer_items: 0,
        product_link: productLinkValue.trim(),
        youtube_link: youtubeLinkValue.trim(),
        is_voucher: is_voucher.current?.checked ? 1 : 0,
        redeem_link: is_voucher.current?.checked ? redeemLinkValue.trim() : '',
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

        try {
          await axiosInstance.post(
            `/admin/topup-product/${productId}/inputs`,
            {
              inputs: productInputs.map((it, idx) => ({
                title: it.title,
                verify_type: it.verify_type || "none",
                verify_player_name:
                  it.verify_type && it.verify_type !== "none" ? 1 : 0,
                verify_url: it.verify_url || "",
                verify_game: it.verify_game || "",
                api_token: it.api_token || "",
                region_lock: it.region_lock || "",
                serial: idx,
              })),
            },
          );
        } catch (e) {
          toast.error(
            `Inputs save failed: ${getErrors(e, false, true)}`,
            toastDefault,
          );
          setLoading(false);
          return;
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

                  <div className="my-3 p-3 border border-blue-100 bg-blue-50 rounded">
                    <label htmlFor="product_link" className="block font-semibold text-blue-900">
                      Product link{' '}
                      <span className="text-xs font-normal text-blue-700">
                        (optional — when set, this product acts as a
                        passthrough: clicking it on the home page opens this
                        URL instead of the topup form, and all other fields
                        below are hidden)
                      </span>
                    </label>
                    <input
                      id="product_link"
                      type="url"
                      className="form_input mt-1"
                      placeholder="https://example.com/external-product"
                      value={productLinkValue}
                      onChange={(e) => setProductLinkValue(e.target.value)}
                    />
                    {!isPassthrough && (
                      <>
                        <label htmlFor="youtube_link" className="block font-semibold text-blue-900 mt-3">
                          YouTube link{' '}
                          <span className="text-xs font-normal text-blue-700">
                            (optional — surfaced beside the Description header on the topup page)
                          </span>
                        </label>
                        <input
                          id="youtube_link"
                          type="url"
                          className="form_input mt-1"
                          placeholder="https://youtube.com/watch?v=…"
                          value={youtubeLinkValue}
                          onChange={(e) => setYoutubeLinkValue(e.target.value)}
                        />
                      </>
                    )}
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

                  {!isPassthrough && (
                  <>
                  <TextEditor
                    value={rulesHtml}
                    onHtmlChange={setRulesHtml}
                    minHeight={300}
                  />

                  {/* Dynamic Inputs ---- */}
                  <div className="my-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="font-semibold">Order form inputs</label>
                      <button
                        type="button"
                        onClick={addInputRow}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                      >
                        + Add input
                      </button>
                    </div>
                    <div className="mb-2 text-xs text-gray-600 bg-amber-50 border border-amber-200 rounded p-2">
                      <strong>Reserved keyword:</strong> "{PLAYER_ID_TITLE}". Using
                      it as a title auto-enables <em>Is active for Id Code</em>,
                      and only one input per product may use it.
                    </div>
                    {productInputs.length === 0 && (
                      <p className="text-sm text-gray-500 italic">
                        No inputs yet. Click "Add input" to define one.
                      </p>
                    )}
                    {productInputs.map((row, idx) => {
                      const reserved = isPlayerIdTitle(row.title);
                      return (
                        <div
                          key={row._key}
                          className="border border-gray-200 rounded p-3 mb-2 bg-white"
                        >
                          <div className="form_grid items-end">
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">
                                Title
                              </label>
                              <input
                                type="text"
                                className="form_input"
                                placeholder='e.g. "Player ID", "Server", "Username"'
                                value={row.title}
                                onChange={(e) =>
                                  updateInputAt(idx, { title: e.target.value })
                                }
                              />
                              {reserved && (
                                <p className="text-[11px] text-amber-700 mt-1">
                                  Reserved title — sets <em>Is active for Id Code</em>{" "}
                                  automatically.
                                </p>
                              )}
                            </div>
                            <div className="flex items-end justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => removeInputAt(idx)}
                                className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {/* Verify settings only make sense for the reserved
                              Player ID input — gate them on the title match. */}
                          {reserved && (
                            <div className="mt-2">
                              <label className="text-xs text-gray-600 block mb-1">
                                Player name check
                              </label>
                              <select
                                className="form_input"
                                value={row.verify_type || "none"}
                                onChange={(e) =>
                                  updateInputAt(idx, {
                                    verify_type: e.target.value,
                                  })
                                }
                              >
                                <option value="none">No name check</option>
                                <option value="dynamic">
                                  Check player name dynamic
                                </option>
                                <option value="gamerspay">
                                  Gamers pay name check
                                </option>
                              </select>

                              {row.verify_type === "dynamic" && (
                                <div className="mt-2">
                                  <div className="mb-2 text-xs bg-blue-50 border border-blue-200 rounded p-2">
                                    <strong className="text-blue-800">
                                      Required tag:
                                    </strong>{" "}
                                    the Verify URL <em>must</em> include{" "}
                                    <code className="bg-white px-1 rounded border border-blue-200 text-blue-700">
                                      &#123;value&#125;
                                    </code>{" "}
                                    where the entered ID should go. Example:
                                    <div className="mt-1 font-mono text-[11px] text-gray-700 break-all">
                                      https://ffapi.ucbot.net/nickname?uid=
                                      <span className="text-blue-700">
                                        &#123;value&#125;
                                      </span>
                                    </div>
                                  </div>
                                  <label className="text-xs text-gray-600 block mb-1">
                                    Verify URL
                                  </label>
                                  <input
                                    type="text"
                                    className="form_input"
                                    placeholder="https://ffapi.ucbot.net/nickname?uid={value}"
                                    value={row.verify_url}
                                    onChange={(e) =>
                                      updateInputAt(idx, {
                                        verify_url: e.target.value,
                                      })
                                    }
                                  />
                                  {row.verify_url &&
                                    !row.verify_url.includes("{value}") && (
                                      <p className="text-[11px] text-red-600 mt-1">
                                        Missing <code>&#123;value&#125;</code>{" "}
                                        tag — add it where the entered ID
                                        should go.
                                      </p>
                                    )}
                                  <label className="text-xs text-gray-600 block mb-1 mt-2">
                                    API Token{" "}
                                    <span className="text-gray-400">
                                      (sent as{" "}
                                      <code>Authorization: Bearer &lt;token&gt;</code>)
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    className="form_input"
                                    placeholder="Optional bearer token for upstream API"
                                    value={row.api_token}
                                    onChange={(e) =>
                                      updateInputAt(idx, {
                                        api_token: e.target.value,
                                      })
                                    }
                                  />
                                  <label className="text-xs text-gray-600 block mb-1 mt-2">
                                    Region Lock{" "}
                                    <span className="text-gray-400">
                                      (verify response is rejected if its{" "}
                                      <code>region</code> doesn&apos;t match)
                                    </span>
                                  </label>
                                  <select
                                    className="form_input"
                                    value={row.region_lock}
                                    onChange={(e) =>
                                      updateInputAt(idx, {
                                        region_lock: e.target.value,
                                      })
                                    }
                                  >
                                    {REGION_OPTIONS.map((opt) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {row.verify_type === "gamerspay" && (
                                <div className="mt-2">
                                  <div className="mb-2 text-xs bg-emerald-50 border border-emerald-200 rounded p-2 text-emerald-900">
                                    Calls{" "}
                                    <code className="bg-white px-1 rounded border border-emerald-200">
                                      POST api.gamerspay.app/api/v1/validate
                                    </code>{" "}
                                    with{" "}
                                    <code className="bg-white px-1 rounded border border-emerald-200">
                                      {"{ game, playerid }"}
                                    </code>{" "}
                                    and your API key in the{" "}
                                    <code className="bg-white px-1 rounded border border-emerald-200">
                                      X-API-Key
                                    </code>{" "}
                                    header. If the API can't validate the
                                    player the storefront blocks the order.
                                  </div>
                                  <label className="text-xs text-gray-600 block mb-1">
                                    Game
                                  </label>
                                  <select
                                    className="form_input"
                                    value={row.verify_game || ""}
                                    onChange={(e) =>
                                      updateInputAt(idx, {
                                        verify_game: e.target.value,
                                      })
                                    }
                                  >
                                    <option value="">— Select game —</option>
                                    {GAMERSPAY_GAMES.map((g) => (
                                      <option key={g} value={g}>
                                        {g}
                                      </option>
                                    ))}
                                  </select>
                                  <label className="text-xs text-gray-600 block mb-1 mt-2">
                                    API key{" "}
                                    <span className="text-gray-400">
                                      (sent as <code>X-API-Key</code>)
                                    </span>
                                  </label>
                                  <input
                                    type="text"
                                    className="form_input"
                                    placeholder="GamersPay X-API-Key value"
                                    value={row.api_token}
                                    onChange={(e) =>
                                      updateInputAt(idx, {
                                        api_token: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* End Dynamic Inputs ---- */}
                  </>
                  )}

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
                  <div className="my-2">
                    <label className="py-2 inline-block cursor-pointer select-none">
                      <input
                        type="checkbox"
                        defaultChecked={data?.is_voucher == 1}
                        ref={is_voucher}
                        className="mr-2"
                        onChange={(e) => setIsVoucherChecked(e.target.checked)}
                      />
                      Is voucher product{" "}
                      <span className="text-xs font-normal text-gray-500">
                        (each package keeps its own pool of redemption codes —
                        manage under <em>Packages → Voucher</em>)
                      </span>
                    </label>
                  </div>
                  {isVoucherChecked && (
                    <div className="my-2">
                      <label htmlFor="redeem_link" className="block font-semibold">
                        Redeem link{" "}
                        <span className="text-xs font-normal text-gray-500">
                          (optional — surfaced on the buyer's completed order as
                          a Redeem button)
                        </span>
                      </label>
                      <input
                        id="redeem_link"
                        type="url"
                        className="form_input mt-1"
                        placeholder="https://example.com/redeem"
                        value={redeemLinkValue}
                        onChange={(e) => setRedeemLinkValue(e.target.value)}
                      />
                    </div>
                  )}

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
