# Address (`S:G:AD`)

A repeatable postal address for a person or organization. Label is application metadata and comes first; Country (`CO`) is the first answer and is required. Its canonical `countries` dataset ID selects `addressFormat`, which supplies field order, labels, requiredness, placeholders and postal validation. For example, US collects State and ZIP; GB collects Post Town and Postal without State. No country is preselected.

All fields are strings: `N` recipient, `O` organization, `L1` multiline street address, `D` dependent locality, `C` locality, `RE` administrative area, `PC` postal code, `SC` sorting code, and `DI` optional delivery instructions. `R` references one terminal Roles concept. `RO` contains reusable address roles, not address answers. `US` retains the historical US-layout record and its field codes for existing data; new records use `S:G:AD`.

`AddressFormat.Fields` maps Geo format field names to answer keys. Only fields in the selected country's format are collected, followed by optional Role and delivery instructions. Display uses that country's percent-token format plus Country and delivery instructions. Country formats with no postal code must not collect one. There are no further subclasses of the new address record. Existing US records are not rewritten, preserving signed facts.

Delivery instructions display with the prefix `Instructions: `. Omit this line when instructions are absent or private. Country-based address formatting uses the delegated `AddressFormat.DisplaySuffix` for Country and this labelled instructions line.
