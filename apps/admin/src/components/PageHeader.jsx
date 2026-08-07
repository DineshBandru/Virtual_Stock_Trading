const PageHeader = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
      {subtitle ? (
        <p className="max-w-2xl text-sm leading-6 text-slate-400">{subtitle}</p>
      ) : null}
    </div>
  );
};

export default PageHeader;
