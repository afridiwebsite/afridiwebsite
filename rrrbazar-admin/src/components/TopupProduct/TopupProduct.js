import React, { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import axiosInstance from "../../common/axios";
import useGet from "../../hooks/useGet";
import { getErrors, hasData, toastDefault } from "../../utils/handler.utils";
import { productTableColumns } from "../../utils/reactTableColumns";
import PackagesAccordion from "../PackagesAccordion";
import ReactTable from "../ReactTables/ReactTable";
import UiHandler from "../UiHandler";

// Mirrors the Packages page: groups are accordions, each accordion holds
// a ReactTable of the products in that group. The backend builds the
// groups (categories + an "Uncategorized" bucket) so the UI just renders.
function TopupProduct() {
  const [refreshKey, setRefreshKey] = useState(false);
  const [groups, loading, error] = useGet(
    `admin/topup-products-by-category`,
    "",
    refreshKey,
  );

  const triggerRefresh = () => setRefreshKey((prev) => !prev);

  return (
    <section className="relative container_admin">
      <div className="bg-white overflow-hidden rounded">
        <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between flex-wrap">
          <h3 className="text-lg font-bold text-black">Product</h3>
          <Link className="cstm_btn" to="/topup-product/add">
            Add new
          </Link>
        </div>
        <div className="md:px-6 my-10 md:max-w-[1000px] min-h-[200px] md:mx-auto">
          <div className="rounded relative overflow-hidden">
            <UiHandler data={groups} loading={loading} error={error} />
            {hasData(groups, loading) &&
              groups.map((group) => (
                <PackagesAccordion
                  key={group.id ?? "uncategorized"}
                  title={`${group.emoji ? group.emoji + " " : ""}${group.name} (${
                    (group.products || []).length
                  })`}
                >
                  <ProductsUnderGroup
                    group={group}
                    onChange={triggerRefresh}
                  />
                </PackagesAccordion>
              ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default TopupProduct;

const ProductsUnderGroup = ({ group, onChange }) => {
  const deleteProductHandler = (id) => {
    if (!window.confirm("Are you sure?")) return;
    toast.promise(
      axiosInstance.post(`admin/topup-product/delete/${id}`),
      {
        pending: "Deleting Product...",
        error: {
          render(err) {
            console.log(err);
            return getErrors(err.data, false, true);
          },
        },
        success: {
          render() {
            onChange();
            return "Product deleted successfully";
          },
        },
      },
      toastDefault,
    );
  };

  const withActionColumn = [
    ...productTableColumns,
    {
      id: "action",
      Header: "Action",
      accessor: "id",
      Cell: (e) => (
        <ul className="flex space-x-2">
          <Link
            to={`/topup-product/edit/${e.value}`}
            className="cstm_btn_small"
          >
            Edit
          </Link>
          <button
            className="cstm_btn_small !bg-red-600 hover:!bg-red-700"
            type="button"
            onClick={() => deleteProductHandler(e.value)}
          >
            Delete
          </button>
          <Link
            to={`/topup-package/add/${e.value}`}
            className="cstm_btn_small"
          >
            Add package
          </Link>
        </ul>
      ),
    },
  ];

  const products = group.products || [];

  if (products.length === 0) {
    return (
      <p className="text-xs italic text-gray-500">
        No products in this {group.id == null ? "bucket" : "category"} yet.
      </p>
    );
  }

  return (
    <ReactTable
      tableId={`product_group_${group.id ?? "uncat"}_table`}
      columns={withActionColumn}
      data={products}
    />
  );
};
