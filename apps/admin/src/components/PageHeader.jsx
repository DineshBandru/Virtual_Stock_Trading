const PageHeader = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-4xl text-white">{title}</h1>
      {subtitle ? (
        <p className="max-w-2xl text-sm text-slate-300">{subtitle}</p>
      ) : null}
    </div>
  );
};

export default PageHeader;
