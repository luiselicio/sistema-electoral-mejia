# Módulo de participación (identificación protegida)

Este módulo implementa la base del modelo **CONFIDENCIAL O SEUDONIMIZADO**:

- Validación local de cédula ecuatoriana (10 dígitos y dígito verificador).
- Derivación criptográfica protegida (HMAC) para control de duplicados.
- Separación respecto al dominio de respuestas políticas (las respuestas se vinculan solo a `participation_id` interno).

Restricciones:
- No almacenar cédula en texto plano.
- No relacionar directamente cédula con preferencia de voto.
- No presentar la validación local como prueba de identidad, nacionalidad o habilitación electoral.
- Unicidad por encuesta (A1).