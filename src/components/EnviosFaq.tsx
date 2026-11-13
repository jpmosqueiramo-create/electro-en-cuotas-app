type FaqItem = {
  question: string;
  answer: string;
};

const FAQS: FaqItem[] = [
  {
    question: "¿Cuándo comienza Envíos Low Cost?",
    answer: "El servicio estará disponible desde el 25 de noviembre de 2026."
  },
  {
    question: "¿Con qué frecuencia realizan los recorridos?",
    answer: "Inicialmente tendremos un recorrido semanal. A medida que aumente la demanda podremos incrementar la frecuencia de los viajes."
  },
  {
    question: "¿Cómo se calcula el traslado?",
    answer: "El traslado se cotiza por bulto, según sus características y el recorrido correspondiente."
  },
  {
    question: "¿Qué beneficio tienen los clientes recurrentes, comercios y emprendedores?",
    answer: "Para clientes recurrentes, comercios y emprendedores, la recepción, consolidación y custodia temporal de la mercadería pueden realizarse sin cargo, sujeto a los cupos generales de capacidad. El traslado al interior se cobra por bulto."
  },
  {
    question: "¿Cuánto tiempo puede quedar la mercadería en custodia?",
    answer: "La custodia bonificada para clientes recurrentes contempla hasta una semana."
  },
  {
    question: "¿Cómo se registra el estado de la mercadería?",
    answer: "Registramos el estado del producto al momento de recibirlo en Cuenta Hogar y nuevamente al momento de entregarlo en destino."
  },
  {
    question: "¿La mercadería puede tener un seguro especial?",
    answer: "Sí. Cuando por el valor o las características de la mercadería sea necesario contratar una cobertura especial, se coordina y cotiza por separado."
  },
  {
    question: "¿Cómo se paga Envíos Low Cost?",
    answer: "Podés pagar mediante transferencia o efectivo. Para clientes recurrentes también puede utilizarse cuenta corriente."
  },
  {
    question: "¿Qué mercadería no transportan?",
    answer: "No transportamos alimentos ni productos que requieran autorizaciones especiales para su transporte."
  },
  {
    question: "¿Qué pasa si no estoy en mi domicilio cuando llega la entrega?",
    answer: "Podemos entregar la mercadería a una persona autorizada o en otro domicilio, siempre que la autorización haya sido informada previamente por escrito."
  },
  {
    question: "¿Suben la mercadería a departamentos o pisos?",
    answer: "La entrega estándar de Cuenta Hogar es en la puerta del domicilio. Podemos colaborar razonablemente con el ingreso del producto, pero no realizamos subida por escaleras."
  },
  {
    question: "¿Instalan electrodomésticos o arman muebles?",
    answer: "No. Cuenta Hogar realiza la entrega, pero no presta servicios de instalación de electrodomésticos ni armado de muebles. El servicio Low Cost está diseñado para mantener costos bajos y las entregas se realizan con una sola persona."
  }
];

export function EnviosFaq() {
  return (
    <div>
      {FAQS.map((faq, idx) => (
        <details key={faq.question} name="shipping-faq" open={idx === 0} className="public-details">
          <summary>{faq.question}</summary>
          <p>{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
