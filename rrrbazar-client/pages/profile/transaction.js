import Head from 'next/head';
import { getUserTransactions } from '../../api/api';
import Badge from '../../components/Badge';
import DataTable from '../../components/data-table/DataTable';
import FlashMessage from '../../components/FlashMessage';
import { __page_title_end } from '../../config/globalConfig';

function OrderPage() {
  return (
    <>
      <Head>
        <title>Transactions {__page_title_end}</title>
      </Head>
      <section className="mt-7 md:mt-0 border-t border-gray-200 md:border-none">
        <FlashMessage showToast />
        <div className="container !px-0 md:!px-5 md:my-7">
          <div>
            <DataTable
              apiFunc={getUserTransactions}
              title="My Transactions"
              apiKey="get-user-transactions"
              columns={['Amount', 'Number', 'Status', 'Date']}
            >
              {(data) => {
                return data.map((d, i) => (
                  <tr key={i}>
                    <td className="_tr">{d?.amount}</td>
                    <td className="_tr">{d?.number}</td>
                    <td className="_tr">
                      <Badge type={d?.status} />
                    </td>
                    <td className="_tr">{d?.created_at}</td>
                  </tr>
                ));
              }}
            </DataTable>
          </div>
        </div>
      </section>
    </>
  );
}

export default OrderPage;
