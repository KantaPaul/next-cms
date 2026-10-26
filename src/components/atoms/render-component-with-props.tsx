export const RenderComponentWithProps = <
  T extends React.ElementType<any> = 'div',
>(
  props: {
    as?: T;
  } & React.ComponentPropsWithoutRef<T>
) => {
  const { as, ...otherProps } = props;
  const Component = as ?? 'div';
  return <Component {...otherProps} />;
};
