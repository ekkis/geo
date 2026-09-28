# US address

Canonical code: `S:G:AD:US`. [Definition](index.json).

This record contains the former `S:G:AD` address fields and the US-style postal
layout. It describes an address instance, whereas `G:CO:US` identifies the
United States as a country. A person (`I:P`) or organization (`I:O`) can have
multiple records, each with a stable instance ID. All fields are optional scalar
answers; an omitted field is unanswered.

The inherited form previously accepted non-US addresses. Migration retains
those country values; the format’s name does not rewrite their geographic
location. This release introduces neither a claim that the US layout is suitable
for every country nor a new postal-code/state validation rule. Future national
formats can specialize the layout without silently recategorizing existing data.

Role is a relationship constrained by Address:Roles. Country is constrained by
Geography:Country. Their stored values are canonical leaf codes, while clients
display the corresponding names. Examples are `S:G:AD:RO:SH` for Shipping and
`G:CO:US` for United States. A generic tag can reference any valid ontology point;
it neither overrides nor implicitly supplies the Role field.

## Display

The default label is the Role’s human-readable name unless the record has an
explicit label. Public presentation uses only public answers. The postal body is:

```text
{L1}
{L2}
{C}, {RE} {PC}
{CO}
Instructions: {DI}
```

Country `G:CO:US` is omitted from the domestic display; other countries display
their human-readable names. Empty lines and dangling punctuation are omitted.
These presentation rules do not rewrite stored values.

## Fields

### Role — `S:G:AD:US:R`

What is the role of this address?

Type: `S:I:D:T:S` (string). Choices reference: `S:G:AD:RO`; only descendant leaves are acceptable. Example: `S:G:AD:RO:BI` (Billing). Role is not a free-text label.

[Field definition](Role.json).

### Address line 1 — `S:G:AD:US:L1`

What is the first address line?

Type: `S:I:D:T:S` (string). Maximum length: 2000 characters. Example: `101 Main Street`.

[Field definition](Line1.json).

### Address line 2 — `S:G:AD:US:L2`

What is the second address line?

Type: `S:I:D:T:S` (string). Maximum length: 2000 characters. Example: `Apartment 4`.

[Field definition](Line2.json).

### City — `S:G:AD:US:C`

What is the city or locality?

Type: `S:I:D:T:S` (string). Maximum length: 2000 characters. Example: `Studio City`.

[Field definition](City.json).

### Region — `S:G:AD:US:RE`

What is the state, province, or region?

Type: `S:I:D:T:S` (string). Maximum length: 2000 characters. Example: `California`. This remains text, not a sourced subdivision selector.

[Field definition](Region.json).

### Postal code — `S:G:AD:US:PC`

What is the postal code?

Type: `S:I:D:T:S` (string). Maximum length: 2000 characters. Example: `91604`. Text preserves leading zeros; no new ZIP constraint is introduced.

[Field definition](PostalCode.json).

### Country — `S:G:AD:US:CO`

What is the country?

Type: `S:I:D:T:S` (string). Choices source: the `countries` dataset; only its record IDs are acceptable. Example: `G:CO:US` (United States). The country list is sourced from a pinned ekkis/geo revision.

[Field definition](Country.json).

### Delivery instructions — `S:G:AD:US:DI`

What instructions should a delivery service follow?

Type: `S:I:D:T:S` (string). Maximum length: 2000 characters. Example: `Use the side entrance`.

[Field definition](DeliveryInstructions.json).

## Earlier records

The version 4.0.0 migration preserves record IDs and existing timestamps. Recognized Role and Country values become canonical references. Unrecognized custom answers are retained in `legacyAnswers` for review, not silently accepted as current choices. Signed statements remain byte-for-byte unchanged and are validated against archived definitions. See the [migration guide](../../../README.md#address-migration).

## Repeatability and composite values

Every definition declares two independent booleans. `Collection: true` means
repeatable values (a vector), not merely a branch with children. `Composite: true`
means the constituent datapoints are entered together as one value. A US address
has both flags: a person can have many addresses, and each address keeps its
street, city, region, postal code and country together. Its fields have both
flags false and are not independently selectable values in the wallet editor.
Organizing branches, roles and reference-dataset definitions have both flags
false. Dataset rows and node children do not imply vector cardinality.

The schema targets ontology 10.2.0. Existing Geography codes, values and record
IDs remain unchanged. Email in Identity is the contrasting example: repeatable
but non-composite, so a user can enter one email without unrelated fields.

Legacy record retained for existing answers and attestations. New addresses use parent `S:G:AD` with Country selected first.

Delivery instructions display with the prefix `Instructions: `. Omit this line when instructions are absent or private. Country-based address formatting uses the delegated `AddressFormat.DisplaySuffix` for Country and this labelled instructions line.
