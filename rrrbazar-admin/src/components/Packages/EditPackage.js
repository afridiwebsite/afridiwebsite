import React, { useEffect, useRef, useState } from "react";
import { useHistory, withRouter } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useUpload from "../../hooks/useUpload";
import useGet from "../../hooks/useGet";
import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import TextEditor from "../TextEditor/TextEditor";
import Loader from "../Loader/Loader";

function EditPackage(props) {
  const history = useHistory();
  const packageId = props.match.params.id;

  const [paymentLogo, setPaymentLogo] = useState(null);
  const { path, uploading } = useUpload(paymentLogo);

  const [loading, setLoading] = useState(null);
  const [data, loadingData] = useGet(`admin/topup-package/${packageId}`);
  const [products, loadingProducts] = useGet(`admin/topup-products`);

  const product_id = useRef(null);
  const name = useRef(null);
  const sell_price = useRef(null);
  const buy_price = useRef(null);
  const in_stock = useRef(null);
  const serial = useRef(null);
  const logo = useRef(null);
  const coin_value = useRef(null);
  const bot_url = useRef(null);
  const allow_quantity = useRef(null);

  const [allowQuantityOn, setAllowQuantityOn] = useState(false);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [quantityLimit, setQuantityLimit] = useState(100);
  useEffect(() => {
    if (!data) return;
    setAllowQuantityOn(Number(data.allow_quantity) === 1);
    setChargeAmount(Number(data.charge_amount) || 0);
    const savedLimit = Number(data.quantity_limit);
    setQuantityLimit(
      Number.isFinite(savedLimit) && savedLimit > 0 ? savedLimit : 100,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const [orderLimit, setOrderLimit] = useState(0);
  useEffect(() => {
    if (data?.order_once == null) return;
    const v = Number(data.order_once);
    setOrderLimit([0, 1, 2, 3, 4].includes(v) ? v : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const [stockTracking, setStockTracking] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  useEffect(() => {
    if (!data) return;
    setStockTracking(Number(data.stock_tracking) === 1);
    setStockQuantity(Number(data.stock_quantity) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const [rewardType, setRewardType] = useState("coin");
  const [cashbackAmount, setCashbackAmount] = useState(0);
  const [resellerCashback, setResellerCashback] = useState(0);
  useEffect(() => {
    if (!data) return;
    const t = String(data.reward_type || "coin").toLowerCase();
    setRewardType(t === "money" ? "money" : "coin");
    setCashbackAmount(Number(data.cashback_amount) || 0);
    setResellerCashback(Number(data.reseller_cashback) || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const [selectedProductId, setSelectedProductId] = useState("");
  useEffect(() => {
    if (data?.product_id) setSelectedProductId(String(data.product_id));
  }, [data?.id, data?.product_id]);

  const [botType, setBotType] = useState("none");
  const autoDeliveryOn = botType === "uc-bot" || botType === "shell-bot";
  const isShell = botType === "shell-bot";
  const [shellValue, setShellValue] = useState("");
  const [tags, setTags] = useState([]);
  const addTag = () => setTags((prev) => [...prev, ""]);
  const updateTag = (idx, value) =>
    setTags((prev) => prev.map((v, i) => (i === idx ? value : v)));
  const removeTag = (idx) =>
    setTags((prev) => prev.filter((_, i) => i !== idx));
  const [likeBotKey, setLikeBotKey] = useState("");
  const [pubgKey, setPubgKey] = useState("");
  const [pubgGame, setPubgGame] = useState("pubg");
  const [pubgSku, setPubgSku] = useState("");
  const [pubgSkus, setPubgSkus] = useState([]);
  const [pubgSkusLoading, setPubgSkusLoading] = useState(false);
  const [pubgSkusError, setPubgSkusError] = useState(null);

  useEffect(() => {
    if (botType !== "pubg-bot") return undefined;
    const game = String(pubgGame || "").trim();
    const key = String(pubgKey || "").trim();
    if (!game || !key) {
      setPubgSkus([]);
      setPubgSkusError(null);
      return undefined;
    }
    const handle = setTimeout(() => {
      setPubgSkusLoading(true);
      setPubgSkusError(null);
      axiosInstance
        .post(`/admin/pubg-bot/products`, { game, api_key: key })
        .then((res) => {
          const payload = res?.data?.data || res?.data || {};
          const items = Array.isArray(payload.items) ? payload.items : [];
          setPubgSkus(items);
          if (items.length === 0) {
            setPubgSkusError("No SKUs returned for this game.");
          }
        })
        .catch((err) => {
          setPubgSkus([]);
          setPubgSkusError(
            getErrors(err, false, true) || "Failed to load SKUs",
          );
        })
        .finally(() => setPubgSkusLoading(false));
    }, 500);
    return () => clearTimeout(handle);
  }, [botType, pubgGame, pubgKey]);

  useEffect(() => {
    if (!data) return;
    const explicit = String(data.bot_type || "")
      .toLowerCase()
      .trim();
    const allowed = ["uc-bot", "shell-bot", "like-bot", "pubg-bot", "none"];
    let next = allowed.includes(explicit) ? explicit : "none";
    if (next === "none") {
      if (Number(data.auto_delivery) === 1 && Number(data.is_shell) === 1)
        next = "shell-bot";
      else if (Number(data.auto_delivery) === 1) next = "uc-bot";
    }
    setBotType(next);

    setShellValue(String(data.shell || ""));
    let parsed = [];
    try {
      const raw = data.tags;
      if (Array.isArray(raw)) parsed = raw;
      else if (typeof raw === "string" && raw.trim().length > 0)
        parsed = JSON.parse(raw);
    } catch {
      parsed = [];
    }
    setTags(
      Array.isArray(parsed)
        ? parsed.map((v) => String(v == null ? "" : v))
        : [],
    );

    let cfg = {};
    try {
      const raw = data.bot_config;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) cfg = raw;
      else if (typeof raw === "string" && raw.trim()) cfg = JSON.parse(raw);
    } catch {
      cfg = {};
    }
    setLikeBotKey(String(cfg.key || ""));
    setPubgKey(String(cfg.key || ""));
    setPubgGame(String(cfg.game || "pubg"));
    setPubgSku(String(cfg.sku || ""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);
  const [mappings, setMappings] = useState([]);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [voucherProducts] = useGet(`admin/voucher-products-with-packages`);
  const [existingMaps, mapsLoading] = useGet(
    `admin/topup-package/${packageId}/voucher-maps`,
  );
  const [pickedProductId, setPickedProductId] = useState("");
  const [pickedPackageId, setPickedPackageId] = useState("");

  useEffect(() => {
    if (Array.isArray(existingMaps)) {
      setMappings(
        existingMaps.map((m) => ({
          voucher_package_id: m.voucher_package_id,
          voucher_package_name: m.voucher_package_name,
          voucher_product_name: m.voucher_product_name,
        })),
      );
    }
  }, [existingMaps]);

  const pickedProduct =
    (voucherProducts || []).find(
      (p) => String(p.id) === String(pickedProductId),
    ) || null;
  const availablePackages = pickedProduct?.packages || [];

  const openMapModal = () => {
    setPickedProductId("");
    setPickedPackageId("");
    setIsMapModalOpen(true);
  };
  const closeMapModal = () => setIsMapModalOpen(false);
  const addMapping = () => {
    if (!pickedProductId || !pickedPackageId) {
      toast.error("Select a product and a package", toastDefault);
      return;
    }
    const pid = Number(pickedPackageId);
    const pack = availablePackages.find((p) => p.id === pid);
    setMappings((prev) => [
      ...prev,
      {
        voucher_package_id: pid,
        voucher_package_name: pack?.name || `Package #${pid}`,
        voucher_product_name: pickedProduct?.name || "—",
      },
    ]);
    setIsMapModalOpen(false);
  };
  const removeMapping = (idx) =>
    setMappings((prev) => prev.filter((_, i) => i !== idx));

  const [descriptionHtml, setDescriptionHtml] = useState("");
  useEffect(() => {
    if (data?.description != null) setDescriptionHtml(data.description || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  const PLAYER_ID_TITLE = "Player ID";
  const isPlayerIdTitle = (t) =>
    String(t || "")
      .trim()
      .toLowerCase() === PLAYER_ID_TITLE.toLowerCase();
  const newInputRow = () => ({
    _key: Math.random().toString(36).slice(2),
    title: "",
    verify_type: "none",
    verify_url: "",
    verify_game: "",
    api_token: "",
    region_lock: "",
  });
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
  const [hasCustomInputs, setHasCustomInputs] = useState(false);
  const [packageInputs, setPackageInputs] = useState([]);
  const updatePkgInputAt = (idx, patch) =>
    setPackageInputs((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    );
  const addPkgInputRow = () =>
    setPackageInputs((prev) => [...prev, newInputRow()]);
  const removePkgInputAt = (idx) =>
    setPackageInputs((prev) => prev.filter((_, i) => i !== idx));

  useEffect(() => {
    if (!data) return;
    setHasCustomInputs(Number(data.has_custom_inputs) === 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  useEffect(() => {
    if (!packageId) return;
    let cancelled = false;
    axiosInstance
      .get(`/admin/topup-package/${packageId}/inputs`)
      .then((res) => {
        if (cancelled) return;
        const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
        setPackageInputs(
          rows.map((r) => ({
            _key: Math.random().toString(36).slice(2),
            title: r.title || "",
            verify_type: r.verify_type || "none",
            verify_url: r.verify_url || "",
            verify_game: r.verify_game || "",
            api_token: r.api_token || "",
            region_lock: r.region_lock || "",
          })),
        );
      })
      .catch(() => {
        /* no inputs saved yet — leave list empty */
      });
    return () => {
      cancelled = true;
    };
  }, [packageId]);

  const editPackageHandler = (e) => {
    e.preventDefault();
    if (botType === "shell-bot") {
      const cleanShell = String(shellValue || "").trim();
      const cleanTags = tags
        .map((t) => String(t || "").trim())
        .filter((t) => t.length > 0);
      if (!cleanShell) {
        toast.error("Shell value is required for Shell-bot", toastDefault);
        return;
      }
      if (cleanTags.length === 0) {
        toast.error("At least one tag is required for Shell-bot", toastDefault);
        return;
      }
    }
    if (botType === "like-bot") {
      if (!String(bot_url.current?.value || "").trim()) {
        toast.error("Like-bot requires a base URL", toastDefault);
        return;
      }
      if (!String(likeBotKey || "").trim()) {
        toast.error("Like-bot requires an API key", toastDefault);
        return;
      }
    }
    if (botType === "pubg-bot") {
      if (!String(pubgKey || "").trim()) {
        toast.error("PUBG-bot requires an API key", toastDefault);
        return;
      }
      if (!String(pubgGame || "").trim()) {
        toast.error("PUBG-bot requires a game selection", toastDefault);
        return;
      }
      if (!String(pubgSku || "").trim()) {
        toast.error("PUBG-bot requires a SKU", toastDefault);
        return;
      }
    }
    if (hasCustomInputs) {
      const playerIdRows = packageInputs.filter((it) =>
        isPlayerIdTitle(it.title),
      );
      if (playerIdRows.length > 1) {
        toast.error(
          `Only one input can use the reserved title "${PLAYER_ID_TITLE}".`,
          toastDefault,
        );
        return;
      }
      if (packageInputs.some((it) => !String(it.title || "").trim())) {
        toast.error("Every dynamic input needs a title.", toastDefault);
        return;
      }
      const dynamicMissingTag = packageInputs.find(
        (it) =>
          it.verify_type === "dynamic" &&
          String(it.verify_url || "").trim() &&
          !String(it.verify_url).includes("{value}"),
      );
      if (dynamicMissingTag) {
        toast.error(
          `Verify URL for "${dynamicMissingTag.title}" must include the {value} tag.`,
          toastDefault,
        );
        return;
      }
      const dynamicEmptyUrl = packageInputs.find(
        (it) =>
          it.verify_type === "dynamic" && !String(it.verify_url || "").trim(),
      );
      if (dynamicEmptyUrl) {
        toast.error(
          `Verify URL is required for "${dynamicEmptyUrl.title}".`,
          toastDefault,
        );
        return;
      }
      const gamerspayMissing = packageInputs.find(
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
    }
    setLoading(true);
    axiosInstance
      .post(`/admin/topup-package/update/${packageId}`, {
        product_id: product_id.current.value,
        name: name.current.value,
        price: sell_price.current.value,
        bprice: buy_price.current.value,
        serial: serial.current.value,
        logo: path || data?.logo,
        reward_type: rewardType,
        coin_value:
          rewardType === "coin" ? Number(coin_value.current?.value || 0) : 0,
        cashback_amount:
          rewardType === "money" ? Number(cashbackAmount) || 0 : 0,
        reseller_cashback: Number(resellerCashback) || 0,
        in_stock: in_stock.current.checked ? 1 : 0,
        order_once: orderLimit,
        allow_quantity: allow_quantity.current?.checked ? 1 : 0,
        charge_amount: Math.max(0, Number(chargeAmount) || 0),
        quantity_limit:
          quantityLimit === "" || quantityLimit === null
            ? 100
            : Math.max(0.01, Number(quantityLimit) || 100),
        bot_url: bot_url.current?.value || "",
        description: descriptionHtml,
        auto_delivery: autoDeliveryOn ? 1 : 0,
        stock_tracking: stockTracking ? 1 : 0,
        stock_quantity: stockTracking
          ? Math.max(0, Number(stockQuantity) || 0)
          : 0,
        is_shell: isShell ? 1 : 0,
        shell: isShell ? String(shellValue || "").trim() : "",
        tags: isShell
          ? tags.map((v) => String(v || "").trim()).filter((v) => v.length > 0)
          : [],
        bot_type: botType,
        bot_config:
          botType === "like-bot"
            ? { key: String(likeBotKey || "").trim() }
            : botType === "pubg-bot"
              ? {
                  key: String(pubgKey || "").trim(),
                  game: String(pubgGame || "").trim(),
                  sku: String(pubgSku || "").trim(),
                }
              : {},
        has_custom_inputs: hasCustomInputs ? 1 : 0,
      })
      .then(async () => {
        try {
          await axiosInstance.post(
            `/admin/topup-package/${packageId}/voucher-maps`,
            {
              voucher_package_ids:
                botType === "uc-bot"
                  ? mappings.map((m) => m.voucher_package_id)
                  : [],
            },
          );
        } catch (e) {
          /* package update already saved; ignore */
        }

        try {
          await axiosInstance.post(`/admin/topup-package/${packageId}/inputs`, {
            inputs: hasCustomInputs
              ? packageInputs.map((it, idx) => ({
                  title: it.title,
                  verify_type: it.verify_type || "none",
                  verify_player_name:
                    it.verify_type && it.verify_type !== "none" ? 1 : 0,
                  verify_url: it.verify_url || "",
                  verify_game: it.verify_game || "",
                  api_token: it.api_token || "",
                  region_lock: it.region_lock || "",
                  serial: idx,
                }))
              : [],
          });
        } catch (e) {
          /* package update already saved; ignore */
        }
        toast.success("Topup package updated successfully", toastDefault);

        setTimeout(() => {
          history.push("/topup-packages");
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
            Edit topup package -- {data?.name}
          </h3>
        </div>
        <div className="py-10 px-4">
          <div className="w-full md:w-[70%] min-h-[250px] mx-auto py-6 relative border border-gray-200 px-4">
            {loadingData || loading || loadingProducts ? (
              <Loader absolute />
            ) : (
              ""
            )}
            {hasData(data) && hasData(products) && (
              <form onSubmit={editPackageHandler}>
                <div>
                  <div className="form_grid">
                    <div>
                      <label htmlFor="name">Product</label>
                      <select
                        defaultValue={data?.product_id}
                        ref={product_id}
                        className="form_input"
                        onChange={(e) => setSelectedProductId(e.target.value)}
                      >
                        {products?.map((product) => (
                          <option value={product.id}>{product.name}</option>
                        ))}
                      </select>
                    </div>
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
                  </div>
                  <div className="form_grid">
                    <div>
                      <label htmlFor="sell_price">Sell price</label>
                      <input
                        ref={sell_price}
                        step="any"
                        id="sell_price"
                        defaultValue={data?.price}
                        className="form_input"
                        type="number"
                        placeholder="Sell price"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="buy_price">Buy price</label>
                      <input
                        ref={buy_price}
                        id="buy_price"
                        defaultValue={data?.bprice}
                        className="form_input"
                        type="number"
                        placeholder="Buy price"
                        required
                      />
                    </div>
                  </div>

                  <div className="form_grid">
                    <div>
                      <label htmlFor="serial">Serial</label>
                      <input
                        ref={serial}
                        id="serial"
                        defaultValue={data?.serial}
                        className="form_input"
                        type="number"
                        placeholder="Package Serial"
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
                        onChange={(e) => setPaymentLogo(e.target.files[0])}
                      />
                    </div>
                  </div>

                  <div className="form_grid">
                    <div>
                      <label htmlFor="reward_type">Reward type</label>
                      <select
                        id="reward_type"
                        className="form_input"
                        value={rewardType}
                        onChange={(e) => setRewardType(e.target.value)}
                      >
                        <option value="coin">Coin</option>
                        <option value="money">Money (Cashback)</option>
                      </select>
                    </div>
                    {rewardType === "coin" ? (
                      <div>
                        <label htmlFor="coin_value">
                          Coin reward per purchase
                        </label>
                        <input
                          ref={coin_value}
                          defaultValue={data?.coin_value || 0}
                          key={`cv-${data?.id}-${rewardType}`}
                          id="coin_value"
                          className="form_input"
                          type="number"
                          min="0"
                          placeholder="0"
                        />
                      </div>
                    ) : (
                      <div>
                        <label htmlFor="cashback_amount">
                          Cashback per purchase (৳)
                        </label>
                        <input
                          id="cashback_amount"
                          className="form_input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={cashbackAmount}
                          onChange={(e) => setCashbackAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form_grid">
                    <div>
                      <label htmlFor="reseller_cashback">
                        Reseller cashback (৳)
                      </label>
                      <input
                        id="reseller_cashback"
                        className="form_input"
                        type="number"
                        min="0"
                        step="0.01"
                        value={resellerCashback}
                        onChange={(e) => setResellerCashback(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label class="inline-flex items-center mt-6">
                        <input
                          ref={in_stock}
                          id="in_stock"
                          value="1"
                          className="form-checkbox"
                          type="checkbox"
                          defaultChecked={data?.in_stock === 1 ? true : false}
                        />
                        <span class="ml-2">In Stock</span>
                      </label>
                    </div>
                  </div>

                  <div className="form_grid">
                    <div>
                      <label className="inline-flex items-center cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="form-checkbox"
                          checked={stockTracking}
                          onChange={(e) => setStockTracking(e.target.checked)}
                        />
                        <span className="ml-2">Track stock quantity</span>
                      </label>
                    </div>
                    {stockTracking && (
                      <div>
                        <label htmlFor="stock_quantity">Stock quantity</label>
                        <input
                          id="stock_quantity"
                          className="form_input"
                          type="number"
                          min="0"
                          value={stockQuantity}
                          onChange={(e) => setStockQuantity(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                    )}
                  </div>

                  <div className="form_grid">
                    <div>
                      <span className="block font-semibold mb-1">
                        Re-order limit
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 0, label: "None" },
                          { value: 1, label: "Order once per player" },
                          { value: 2, label: "Order once a day per player" },
                          { value: 3, label: "Order once per user" },
                          { value: 4, label: "Order once a day per user" },
                        ].map((opt) => (
                          <label
                            key={opt.value}
                            className="inline-flex items-center cursor-pointer select-none"
                          >
                            <input
                              type="radio"
                              name="order_once"
                              className="mr-2"
                              checked={orderLimit === opt.value}
                              onChange={() => setOrderLimit(opt.value)}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="form_grid mt-3">
                    <div>
                      <label className="inline-flex items-center cursor-pointer select-none">
                        <input
                          ref={allow_quantity}
                          id="allow_quantity"
                          value="1"
                          className="form-checkbox"
                          type="checkbox"
                          checked={allowQuantityOn}
                          onChange={(e) => setAllowQuantityOn(e.target.checked)}
                        />
                        <span className="ml-2">Dollar input system</span>
                      </label>
                    </div>
                  </div>

                  {allowQuantityOn && (
                    <div className="form_grid">
                      <div>
                        <label htmlFor="charge_amount">
                          Charge per order (৳)
                        </label>
                        <input
                          id="charge_amount"
                          className="form_input"
                          type="number"
                          min="0"
                          step="0.01"
                          value={chargeAmount}
                          onChange={(e) => setChargeAmount(e.target.value)}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label htmlFor="quantity_limit">Quantity limit</label>
                        <input
                          id="quantity_limit"
                          className="form_input"
                          type="number"
                          min="0.01"
                          step="any"
                          value={quantityLimit}
                          onChange={(e) => setQuantityLimit(e.target.value)}
                          placeholder="100"
                        />
                      </div>
                    </div>
                  )}

                  <div className="form_grid mt-5">
                    <div>
                      <label
                        htmlFor="bot_type"
                        className="block font-semibold mb-1"
                      >
                        Bot type
                      </label>
                      <select
                        id="bot_type"
                        className="form_input"
                        value={botType}
                        onChange={(e) => setBotType(e.target.value)}
                      >
                        <option value="none">None — manual fulfilment</option>
                        <option value="uc-bot">UC-bot</option>
                        <option value="shell-bot">Shell-bot</option>
                        <option value="like-bot">Like-bot</option>
                        <option value="pubg-bot">GamersPay</option>
                      </select>

                      {(botType === "uc-bot" ||
                        botType === "shell-bot" ||
                        botType === "like-bot") && (
                        <div className="form_grid">
                          <div>
                            <label htmlFor="bot_url">
                              {botType === "like-bot"
                                ? "Like-bot URL"
                                : "Auto-bot URL"}
                            </label>
                            <input
                              ref={bot_url}
                              id="bot_url"
                              type="url"
                              defaultValue={data?.bot_url || ""}
                              key={`bu-${data?.id}-${botType}`}
                              className="form_input"
                              placeholder={
                                botType === "like-bot"
                                  ? "https://api.fflike.shop/api/like"
                                  : "https://bot.example.com/dispatch"
                              }
                            />
                          </div>
                        </div>
                      )}

                      {botType === "shell-bot" && (
                        <div className="form_grid">
                          <div>
                            <label htmlFor="shell_value">Shell value</label>
                            <input
                              id="shell_value"
                              type="text"
                              className="form_input"
                              value={shellValue}
                              onChange={(e) => setShellValue(e.target.value)}
                              placeholder="e.g. SHELL-CODE-001"
                            />
                          </div>
                        </div>
                      )}

                      {botType === "like-bot" && (
                        <div className="form_grid">
                          <div>
                            <label htmlFor="like_bot_key">
                              Like-bot API key
                            </label>
                            <input
                              id="like_bot_key"
                              type="text"
                              className="form_input"
                              value={likeBotKey}
                              onChange={(e) => setLikeBotKey(e.target.value)}
                              placeholder="e.g. AMS-3A9BA3250A6A3"
                            />
                          </div>
                        </div>
                      )}

                      {botType === "pubg-bot" && (
                        <>
                          <div className="form_grid">
                            <div>
                              <label htmlFor="pubg_key">PUBG-bot API key</label>
                              <input
                                id="pubg_key"
                                type="text"
                                className="form_input"
                                value={pubgKey}
                                onChange={(e) => setPubgKey(e.target.value)}
                                placeholder="X-API-Key value"
                              />
                            </div>
                            <div>
                              <label htmlFor="pubg_game">Game</label>
                              <select
                                id="pubg_game"
                                className="form_input"
                                value={pubgGame}
                                onChange={(e) => {
                                  setPubgGame(e.target.value);
                                  setPubgSku("");
                                }}
                              >
                                <option value="pubg">pubg</option>
                                <option value="ff_mena">ff_mena</option>
                                <option value="ff_cis">ff_cis</option>
                                <option value="ff_sg">ff_sg</option>
                                <option value="ff_eu">ff_eu</option>
                                <option value="ff_bd">ff_bd</option>
                                <option value="ff_pk">ff_pk</option>
                                <option value="ff_latam">ff_latam</option>
                                <option value="ff_vn">ff_vn</option>
                                <option value="ff_tw">ff_tw</option>
                                <option value="ff_br">ff_br</option>
                                <option value="ff_id">ff_id</option>
                              </select>
                            </div>
                          </div>
                          <div className="form_grid">
                            <div className="sm:col-span-2">
                              <label htmlFor="pubg_sku">SKU</label>
                              <select
                                id="pubg_sku"
                                className="form_input"
                                value={pubgSku}
                                onChange={(e) => setPubgSku(e.target.value)}
                                disabled={
                                  pubgSkusLoading &&
                                  pubgSkus.length === 0 &&
                                  !pubgSku
                                }
                              >
                                <option value="">
                                  {pubgSkusLoading
                                    ? "Loading SKUs…"
                                    : pubgSkus.length === 0
                                      ? "Enter API key to load SKUs"
                                      : "-- Select SKU --"}
                                </option>
                                {pubgSku &&
                                  !pubgSkus.some(
                                    (it) => it.sku === pubgSku,
                                  ) && (
                                    <option value={pubgSku}>
                                      {pubgSku} (saved)
                                    </option>
                                  )}
                                {pubgSkus.map((item) => (
                                  <option key={item.sku} value={item.sku}>
                                    {item.display || item.sku}
                                    {item.price != null
                                      ? ` — $${item.price}`
                                      : ""}
                                  </option>
                                ))}
                              </select>
                              {pubgSkusError && (
                                <p className="text-xs text-red-600 mt-1">
                                  {pubgSkusError}
                                </p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {autoDeliveryOn && isShell && (
                        <div className="mt-3 border border-gray-200 rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">
                              Tags ({tags.length})
                              <span className="text-xs font-normal text-red-600 ml-1">
                                * at least one required
                              </span>
                            </span>
                            <button
                              type="button"
                              onClick={addTag}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                            >
                              + Add tag
                            </button>
                          </div>
                          {tags.length === 0 && (
                            <p className="text-xs text-gray-500 italic">
                              No tags yet. Click "Add tag" to add one.
                            </p>
                          )}
                          {tags.length > 0 && (
                            <ul className="flex flex-col gap-1.5">
                              {tags.map((v, i) => (
                                <li
                                  key={i}
                                  className="flex items-center gap-2 bg-white border border-gray-200 rounded px-2 py-1.5"
                                >
                                  <span className="text-xs text-gray-500 w-6 text-right">
                                    #{i + 1}
                                  </span>
                                  <input
                                    type="text"
                                    className="form_input !mb-0 flex-1"
                                    value={v}
                                    onChange={(e) =>
                                      updateTag(i, e.target.value)
                                    }
                                    placeholder="e.g. 60UC"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeTag(i)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {autoDeliveryOn && !isShell && (
                        <div className="mt-3 border border-gray-200 rounded p-3 bg-gray-50">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-semibold">
                              Mapped voucher packages ({mappings.length})
                            </span>
                            <button
                              type="button"
                              onClick={openMapModal}
                              className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                            >
                              + Add new
                            </button>
                          </div>
                          {mapsLoading && (
                            <p className="text-xs text-gray-500 italic">
                              Loading…
                            </p>
                          )}
                          {!mapsLoading && mappings.length === 0 && (
                            <p className="text-xs text-gray-500 italic">
                              No voucher packages mapped yet.
                            </p>
                          )}
                          {mappings.length > 0 && (
                            <ul className="flex flex-col gap-1.5">
                              {mappings.map((m, i) => (
                                <li
                                  key={`${m.voucher_package_id}-${i}`}
                                  className="flex items-center justify-between bg-white border border-gray-200 rounded px-3 py-1.5 text-sm"
                                >
                                  <span>
                                    <strong>{m.voucher_product_name}</strong>
                                    <span className="text-gray-400 mx-1">
                                      ›
                                    </span>
                                    {m.voucher_package_name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => removeMapping(i)}
                                    className="text-red-600 hover:text-red-800 text-xs"
                                  >
                                    Remove
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="my-4 p-3 border border-indigo-100 bg-indigo-50 rounded">
                    <label className="inline-flex items-center cursor-pointer select-none font-semibold text-indigo-900">
                      <input
                        type="checkbox"
                        className="form-checkbox mr-2"
                        checked={hasCustomInputs}
                        onChange={(e) => setHasCustomInputs(e.target.checked)}
                      />
                      Override product inputs for this package
                    </label>

                    {hasCustomInputs && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-semibold">
                            Order form inputs
                          </label>
                          <button
                            type="button"
                            onClick={addPkgInputRow}
                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded"
                          >
                            + Add input
                          </button>
                        </div>
                        {packageInputs.length === 0 && (
                          <p className="text-sm text-gray-500 italic">
                            No inputs yet.
                          </p>
                        )}
                        {packageInputs.map((row, idx) => {
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
                                      updatePkgInputAt(idx, {
                                        title: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div className="flex items-end justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => removePkgInputAt(idx)}
                                    className="px-3 py-2 bg-red-100 text-red-700 rounded text-sm"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              {reserved && (
                                <div className="mt-2">
                                  <label className="text-xs text-gray-600 block mb-1">
                                    Player name check
                                  </label>
                                  <select
                                    className="form_input"
                                    value={row.verify_type || "none"}
                                    onChange={(e) =>
                                      updatePkgInputAt(idx, {
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
                                      <label className="text-xs text-gray-600 block mb-1">
                                        Verify URL
                                      </label>
                                      <input
                                        type="text"
                                        className="form_input"
                                        placeholder="https://example.com/nickname?uid={value}"
                                        value={row.verify_url}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            verify_url: e.target.value,
                                          })
                                        }
                                      />
                                      <label className="text-xs text-gray-600 block mb-1 mt-2">
                                        API Token
                                      </label>
                                      <input
                                        type="text"
                                        className="form_input"
                                        placeholder="Optional bearer token for upstream API"
                                        value={row.api_token}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            api_token: e.target.value,
                                          })
                                        }
                                      />
                                      <label className="text-xs text-gray-600 block mb-1 mt-2">
                                        Region Lock
                                      </label>
                                      <select
                                        className="form_input"
                                        value={row.region_lock}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            region_lock: e.target.value,
                                          })
                                        }
                                      >
                                        {REGION_OPTIONS.map((opt) => (
                                          <option
                                            key={opt.value}
                                            value={opt.value}
                                          >
                                            {opt.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  )}

                                  {row.verify_type === "gamerspay" && (
                                    <div className="mt-2">
                                      <label className="text-xs text-gray-600 block mb-1">
                                        Game
                                      </label>
                                      <select
                                        className="form_input"
                                        value={row.verify_game || ""}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
                                            verify_game: e.target.value,
                                          })
                                        }
                                      >
                                        <option value="">
                                          — Select game —
                                        </option>
                                        {GAMERSPAY_GAMES.map((g) => (
                                          <option key={g} value={g}>
                                            {g}
                                          </option>
                                        ))}
                                      </select>
                                      <label className="text-xs text-gray-600 block mb-1 mt-2">
                                        API key
                                      </label>
                                      <input
                                        type="text"
                                        className="form_input"
                                        placeholder="GamersPay X-API-Key value"
                                        value={row.api_token}
                                        onChange={(e) =>
                                          updatePkgInputAt(idx, {
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
                    )}
                  </div>

                  <div className="my-4">
                    <label className="block mb-2 font-semibold">
                      Description
                    </label>
                    <TextEditor
                      value={descriptionHtml}
                      onHtmlChange={setDescriptionHtml}
                      minHeight={220}
                    />
                  </div>

                  <div>
                    <button
                      type="submit"
                      disabled={uploading}
                      className="cstm_btn w-full block"
                    >
                      Edit package
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {isMapModalOpen && (
        <div
          className="fixed inset-0 z-[9999999] bg-black/50 flex items-center justify-center p-4"
          onClick={closeMapModal}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-xs flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-2.5 border-b border-gray-200 flex items-center justify-between">
              <h4 className="text-base font-bold text-black">
                Map voucher package
              </h4>
              <button
                type="button"
                onClick={closeMapModal}
                className="text-gray-500 hover:text-gray-800 text-xl leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="px-4 py-3 flex flex-col gap-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Voucher product
                </label>
                <select
                  className="form_input !mb-0 !py-1.5"
                  value={pickedProductId}
                  onChange={(e) => {
                    setPickedProductId(e.target.value);
                    setPickedPackageId("");
                  }}
                >
                  <option value="">-- Select product --</option>
                  {(voucherProducts || []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                {voucherProducts === null && (
                  <p className="text-xs text-gray-500 mt-1">Loading…</p>
                )}
                {Array.isArray(voucherProducts) &&
                  voucherProducts.length === 0 && (
                    <p className="text-xs text-amber-700 mt-1">
                      No voucher-type products yet. Mark a product as
                      <em> "Is voucher product"</em> first.
                    </p>
                  )}
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-1">
                  Package
                </label>
                <select
                  className="form_input !mb-0 !py-1.5"
                  value={pickedPackageId}
                  onChange={(e) => setPickedPackageId(e.target.value)}
                  disabled={!pickedProductId}
                >
                  <option value="">-- Select package --</option>
                  {availablePackages.map((pk) => (
                    <option key={pk.id} value={pk.id}>
                      {pk.name}
                    </option>
                  ))}
                </select>
                {pickedProductId && availablePackages.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    This product has no packages.
                  </p>
                )}
              </div>
            </div>
            <div className="px-4 py-2.5 border-t border-gray-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeMapModal}
                className="cstm_btn_small !bg-gray-200 !text-gray-700 hover:!bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={addMapping}
                disabled={!pickedProductId || !pickedPackageId}
                className="cstm_btn_small disabled:opacity-60"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default withRouter(EditPackage);
