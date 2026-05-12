/*
 *
 * Title: Game
 * Description: --
 * Author: Saymon
 * Date: 25 November 2021 (Thursday)
 *
 */
import Link from 'next/link';
import { imgPath } from '/helpers/helpers';
function Game({ game }) {
  const { logo, name, id } = game;
  return (
    <div className="group bg-white rounded-md overflow-hidden border border-transparent hover:border-gray-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
      <Link href={`/topup/${id}`}>
        <a target="_blank" rel="noreferrer" className="block">
          <div className="overflow-hidden aspect-square bg-gray-100">
            <img
              src={imgPath(logo)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              alt={name}
            />
          </div>
          <div className="py-1.5 px-2 text-center">
            <h6 className="text-xs font-semibold text-gray-700 truncate">{name}</h6>
          </div>
        </a>
      </Link>
    </div>
  );
}

export default Game;
