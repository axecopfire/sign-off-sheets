import { FormEvent } from "react";
import styles from "../styles/Github.module.css";

const formElementNames = [
  ["studentName", "Student Github username"],
  ["mentorName", "Mentor Github username"],
  ["learningPath", "Learning Path"],
] as const;

// https://steveholgado.com/typescript-types-from-arrays/
type FormPropertyNames = typeof formElementNames[number][0];

export default function Github() {
  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const getFormProperty = (name: FormPropertyNames) =>
      (event.currentTarget.elements.namedItem(name) as HTMLInputElement).value;

    const formProperties = formElementNames.reduce((acc, val) => {
      const elementPropertyName = val[0];
      return {
        ...acc,
        [elementPropertyName]: getFormProperty(elementPropertyName),
      };
    }, {});

    const data = await fetch("/api/github", {
      method: "POST",
      body: JSON.stringify({ ...formProperties, addIndividualAccesses: true }),
    }).then((d) => d.json());

    console.log({ data });

    console.table(formProperties);
  };

  return (
    <main className={styles.github}>
      <h1>Create student repo</h1>
      <form onSubmit={handleSubmit}>
        {formElementNames.map((elementName, i) => (
          <div key={`${elementName}-${i}`}>
            <label htmlFor={elementName[0]}>{elementName[1]}</label>
            <input type="text" name={elementName[0]} />
          </div>
        ))}
        <button>Submit</button>
      </form>
    </main>
  );
}
