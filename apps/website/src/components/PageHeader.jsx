const PageHeader = ({ title, subtitle }) => {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-3xl font-semibold text-[#F4F5FA]">{title}</h1>
      {subtitle ? (
        <p className="max-w-3xl text-sm leading-6 text-[#A1A1B5]">{subtitle}</p>
      ) : null}
    </div>
  );
};

export default PageHeader;
