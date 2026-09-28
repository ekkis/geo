# Geography

Canonical code: `S:G`. [Definition](index.json).

Geography currently separates address formats and uses from the countries or
territories those addresses identify.

## Subclassifications

- [Address](Address/README.md) (`S:G:AD`) contains Roles (`S:G:AD:RO`) and the US
  address format (`S:G:AD:US`). A format defines record fields and presentation;
  a role defines an address’s use. These are distinct from the location itself.
- [Country](Country/README.md) (`S:G:CO`) defines a country or territory. Named
  places live in the separate countries dataset, used by dataset-backed Choices.

For example, a record at `S:G:AD:US` can have Role `S:G:AD:RO:BI` and Country
`G:CO:US`: it uses the US address form, is used for billing and identifies a
location in the United States. A tag provides an additional generic relationship
and does not replace either constrained field.

Geo owns this canonical branch and the countries/states datasets. VowLabs mounts
it at `S:G` and proxies requests to this service. No definition codes are renamed.

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
