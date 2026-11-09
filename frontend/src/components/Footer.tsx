import uabcsSeal from "../assets/logos/uabcs-seal.png";
import dascLockup from "../assets/logos/dasc-lockup.png";

function Footer() {
  return (
    <footer className="w-full border-t border-rule px-4 md:px-8 py-5 flex flex-col items-center justify-center gap-2.5">
      <div className="flex items-center gap-4">
        <img src={uabcsSeal} alt="UABCS" title="UABCS" className="h-9 object-contain" />
        <img src={dascLockup} alt="DASC" title="DASC" className="h-9 object-contain" />
      </div>
      <p className="text-[11.5px] text-ink-faint text-center m-0">
        Universidad Autónoma de Baja California Sur
      </p>
    </footer>
  );
}

export default Footer;
