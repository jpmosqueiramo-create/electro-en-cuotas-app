import type { FormEventHandler } from "react";

type Field = { value: string; onChange: (value: string) => void };
type Props = {
  name: Field;
  phone: Field;
  locality: Field;
  product: Field;
  submitting: boolean;
  error: string;
  onSubmit: FormEventHandler<HTMLFormElement>;
};

export default function PublicConsultationForm({ name, phone, locality, product, submitting, error, onSubmit }: Props) {
  return (
    <form className="public-form" onSubmit={onSubmit} aria-busy={submitting}>
      <label>Nombre y apellido
        <input type="text" required autoComplete="name" value={name.value} onChange={event => name.onChange(event.target.value)} />
      </label>
      <label>WhatsApp
        <input type="tel" required autoComplete="tel" value={phone.value} onChange={event => phone.onChange(event.target.value)} />
      </label>
      <label>Localidad de entrega
        <input type="text" required autoComplete="address-level2" value={locality.value} onChange={event => locality.onChange(event.target.value)} />
      </label>
      <label>¿Qué producto estás buscando?
        <textarea required rows={3} value={product.value} onChange={event => product.onChange(event.target.value)} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="public-button justify-self-start" type="submit" disabled={submitting}>
        {submitting ? "Procesando solicitud…" : "Recibir una propuesta por WhatsApp"}
      </button>
    </form>
  );
}
